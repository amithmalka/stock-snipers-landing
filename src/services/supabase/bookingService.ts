import { supabase } from '../../config/supabase';

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "10:00"
  booked: boolean;
}

export interface SlotsResult {
  slots: TimeSlot[];
  reason: 'ok' | 'no_hours_at_all' | 'no_hours_this_day' | 'date_blocked' | 'error';
  errorDetail?: string;
}

interface AvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AppointmentRow {
  slot_start: string;
}

// Generate slots between startTime and endTime, each `durationMinutes` long.
// Example: 09:00–17:00 with duration=30 → 16 slots of 30 min each.
function generateSlots(startTime: string, endTime: string, durationMinutes = 60): Array<{ start: string; end: string }> {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  const step = Math.max(15, durationMinutes); // minimum 15min slot
  const slots = [];
  while (cur + step <= end) {
    const s = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
    cur += step;
    const e = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
    slots.push({ start: s, end: e });
  }
  return slots;
}

/** Diagnostic version: returns reason along with slots. */
export async function fetchSlotsForDateDetailed(providerId: string, date: string, durationMinutes = 60): Promise<SlotsResult> {
  // Outermost guaranteed timeout. Even if every other timeout in
  // fetchSlotsForDateInternal fails to fire (some iOS PWA states), this
  // resolves the promise after 6 seconds — never blocking the UI longer.
  return Promise.race<SlotsResult>([
    fetchSlotsForDateInternal(providerId, date, durationMinutes),
    new Promise((resolve) => setTimeout(() => resolve({
      slots: [],
      reason: 'error',
      errorDetail: 'wrapper-timeout-6000ms',
    }), 6000)),
  ]);
}

/** Returns available time slots for a provider on a given date (YYYY-MM-DD). */
export async function fetchSlotsForDate(providerId: string, date: string, durationMinutes = 60): Promise<TimeSlot[]> {
  const r = await fetchSlotsForDateInternal(providerId, date, durationMinutes);
  return r.slots;
}

// Same-origin path (Vercel rewrite proxies to siel-backoffice)
// This avoids cross-origin issues in iOS PWA standalone mode.
const BACKOFFICE_API = '/api/public-availability';

async function fetchSlotsForDateInternal(providerId: string, date: string, durationMinutes = 60): Promise<SlotsResult> {
  console.log('[fetchSlotsForDate] called with', { providerId, date });

  // Guard against invalid providerId
  if (!providerId || typeof providerId !== 'string' || providerId.length < 10) {
    console.error('[fetchSlotsForDate] invalid providerId:', providerId);
    return { slots: [], reason: 'error' };
  }

  // Parse date in local timezone (avoid UTC midnight surprises)
  const [yy, mm, dd] = date.split('-').map(Number);
  const dayOfWeek = new Date(yy, mm - 1, dd).getDay(); // 0=Sun

  let avRows: Array<{ day_of_week: number; start_time: string; end_time: string }> = [];
  let blockedDates: string[] = [];
  let errorDetail = '';
  let fetchOk = false;

  // Race API and direct Supabase IN PARALLEL — first success wins.
  // A single master timeout (via Promise.race) guarantees we NEVER wait
  // more than 5 seconds regardless of what the fetches do — setTimeout is
  // the only primitive that always fires on iOS PWA.
  const apiController = new AbortController();
  const sbController = new AbortController();

  type Result = { source: 'api' | 'sb'; slots: typeof avRows; blocked: string[] };

  const apiPromise: Promise<Result> = (async () => {
    const url = `${BACKOFFICE_API}?providerId=${encodeURIComponent(providerId)}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: apiController.signal });
    if (!res.ok) throw new Error(`api-http-${res.status}`);
    const json = await res.json();
    return { source: 'api' as const, slots: json.slots ?? [], blocked: json.blocked ?? [] };
  })();

  const sbPromise: Promise<Result> = (async () => {
    const { data, error } = await supabase
      .from('availability_slots')
      .select('day_of_week, start_time, end_time')
      .eq('provider_id', providerId)
      .abortSignal(sbController.signal);
    if (error) throw new Error('sb-' + error.message);
    return { source: 'sb' as const, slots: data ?? [], blocked: [] };
  })();

  // Master deadline — always fires, never throttled mid-task.
  let masterTimer: ReturnType<typeof setTimeout> | undefined;
  const masterDeadline = new Promise<never>((_, rej) => {
    masterTimer = setTimeout(() => rej(new Error('master-timeout-5000ms')), 5000);
  });

  // Suppress unhandled-rejection noise from the loser promise.
  apiPromise.catch(() => {});
  sbPromise.catch(() => {});

  try {
    const winner = await Promise.race([
      Promise.any([apiPromise, sbPromise]),
      masterDeadline,
    ]);
    avRows = winner.slots;
    blockedDates = winner.blocked;
    fetchOk = true;
    // Abort the loser to free resources
    if (winner.source === 'api') sbController.abort();
    else apiController.abort();
    console.log('[fetchSlotsForDate]', winner.source, 'returned', avRows.length, 'rows');
  } catch (e) {
    // Either AggregateError (both failed) or master-timeout
    apiController.abort();
    sbController.abort();
    const aggErrors = (e as { errors?: Error[] }).errors;
    if (aggErrors?.length) {
      errorDetail = aggErrors.map((err) => err.message).join(' | ');
    } else {
      errorDetail = e instanceof Error ? e.message : String(e);
    }
  } finally {
    if (masterTimer) clearTimeout(masterTimer);
  }

  if (!fetchOk) {
    return { slots: [], reason: 'error', errorDetail: errorDetail || 'no response' };
  }

  if (!avRows || avRows.length === 0) {
    return { slots: [], reason: 'no_hours_at_all' };
  }

  const todayDayRows = avRows.filter((r) => r.day_of_week === dayOfWeek);
  if (todayDayRows.length === 0) {
    return { slots: [], reason: 'no_hours_this_day' };
  }

  // Check if date is blocked (use blockedDates from API if available,
  // otherwise fall back to direct query)
  if (blockedDates && blockedDates.length > 0) {
    if (blockedDates.includes(date)) {
      return { slots: [], reason: 'date_blocked' };
    }
  } else {
    try {
      const { data: blocked } = await supabase
        .from('blocked_dates')
        .select('blocked_date')
        .eq('provider_id', providerId)
        .eq('blocked_date', date)
        .maybeSingle();
      if (blocked) return { slots: [], reason: 'date_blocked' };
    } catch {}
  }

  // Get existing appointments for that day
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;
  const { data: appts } = await supabase
    .from('appointments')
    .select('slot_start')
    .eq('provider_id', providerId)
    .gte('slot_start', dayStart)
    .lte('slot_start', dayEnd)
    .neq('status', 'cancelled');

  const bookedTimes = new Set(
    (appts as AppointmentRow[] | null)?.map((a) => a.slot_start.substring(11, 16)) ?? [],
  );

  // Generate slots from every interval defined for this day
  // (supports split shifts like morning + evening with a break)
  const allSlots: { start: string; end: string }[] = [];
  const seen = new Set<string>();
  for (const av of todayDayRows as AvailabilityRow[]) {
    const rangeSlots = generateSlots(av.start_time, av.end_time, durationMinutes);
    for (const s of rangeSlots) {
      if (!seen.has(s.start)) {
        seen.add(s.start);
        allSlots.push(s);
      }
    }
  }
  allSlots.sort((a, b) => a.start.localeCompare(b.start));

  return {
    slots: allSlots.map((s) => ({ ...s, booked: bookedTimes.has(s.start) })),
    reason: 'ok',
  };
}

/** Create an appointment. Returns the new appointment id. */
export async function createAppointment(
  providerId: string,
  date: string,
  slot: { start: string; end: string },
  note = '',
  serviceName?: string,
  servicePrice?: number,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('לא מחוברת');

  // Include local timezone offset so Supabase stores the correct UTC time
  const tzOffset = -new Date().getTimezoneOffset(); // minutes ahead of UTC
  const sign = tzOffset >= 0 ? '+' : '-';
  const tzH = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const tzM = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  const tz = `${sign}${tzH}:${tzM}`;
  const slotStart = `${date}T${slot.start}:00${tz}`;
  const slotEnd = `${date}T${slot.end}:00${tz}`;

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      provider_id: providerId,
      user_id: user.id,
      slot_start: slotStart,
      slot_end: slotEnd,
      status: 'pending',
      note,
      ...(serviceName ? { service_name: serviceName } : {}),
      ...(servicePrice !== undefined ? { service_price: servicePrice } : {}),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  try {
    const { track } = await import('../../lib/posthog');
    track('appointment_booked', { providerId, hasService: Boolean(serviceName), price: servicePrice ?? null });
  } catch {}
  return data.id;
}
