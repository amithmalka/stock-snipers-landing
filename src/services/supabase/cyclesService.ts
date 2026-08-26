import { supabase } from '../../config/supabase';
import { CycleEntry, VesetDate, CalculationResult } from '../../types/halachic';

// ── DB row shapes ──────────────────────────────────────────
interface CycleRow {
  id: string;
  user_id: string;
  start_date: string;
  hebrew_date: string;
  onah: 'day' | 'night';
  hefsek_date: string | null;
  created_at: string;
}

interface VesetRow {
  id: string;
  cycle_id: string;
  user_id: string;
  date: string;
  type: VesetDate['type'];
  onah: 'day' | 'night';
  is_fixed: boolean;
  created_at: string;
}

// ── Mappers ────────────────────────────────────────────────
function rowToCycleEntry(row: CycleRow): CycleEntry {
  return {
    id: row.id,
    userId: row.user_id,
    startDate: row.start_date,
    hebrewDate: row.hebrew_date,
    onah: row.onah,
    hefsekDate: row.hefsek_date ?? undefined,
    createdAt: row.created_at,
  };
}

// ── Service ────────────────────────────────────────────────

/** Fetch all cycles for the current user, sorted oldest-first. */
export async function fetchCycles(_userId: string): Promise<CycleEntry[]> {
  const { ensureSession, withTimeout } = await import('./session');
  // Use authUserId from session, NOT the passed-in userId, to guarantee
  // it matches auth.uid() in RLS.
  const authUserId = await ensureSession();
  const { data, error } = await withTimeout(
    supabase
      .from('cycles')
      .select('*')
      .eq('user_id', authUserId)
      .order('start_date', { ascending: true })
      .then((res) => res),
    8000,
    'fetchCycles',
  );

  if (error) throw error;
  const rows = (data as CycleRow[]).map(rowToCycleEntry);

  // If DB returns empty but user_metadata has a backup cycle (e.g. the cycles
  // table write was blocked by RLS), include it so the UI/notifications work.
  if (rows.length === 0) {
    try {
      const { data: u } = await supabase.auth.getUser();
      const lc = (u.user?.user_metadata as { last_cycle?: { id: string; start_date: string; hebrew_date: string; onah: 'day' | 'night'; hefsek_date: string | null } } | null)?.last_cycle;
      if (lc?.id && lc.start_date) {
        rows.push({
          id: lc.id,
          userId,
          startDate: lc.start_date,
          hebrewDate: lc.hebrew_date,
          onah: lc.onah,
          hefsekDate: lc.hefsek_date ?? undefined,
          createdAt: new Date().toISOString(),
        });
      }
    } catch {}
  }
  return rows;
}

/** Persist a new cycle and its calculated veset dates. */
export async function saveCycle(
  _userId: string,
  entry: CycleEntry,
  result: CalculationResult,
): Promise<void> {
  const { ensureSession, withLockRetry, withTimeout } = await import('./session');
  // CRITICAL: use the user id from the CURRENT authenticated session, NOT
  // the userId passed in from React state. RLS policies check auth.uid(),
  // so they must match the session's user. Passing a stale id from React
  // state was causing all writes to be silently blocked.
  const authUserId = await withLockRetry(() => ensureSession());

  // Backup latest cycle to user_metadata (RLS-free). auth.updateUser goes
  // through the Web Locks API, which can hang indefinitely inside an iOS PWA —
  // and because it was awaited, a hang here blocked the actual cycle insert
  // below. Time-box it so the real save always proceeds; the backup is optional.
  try {
    await withTimeout(
      supabase.auth.updateUser({
        data: {
          last_cycle: {
            id: entry.id,
            start_date: entry.startDate,
            hebrew_date: entry.hebrewDate,
            onah: entry.onah,
            hefsek_date: entry.hefsekDate ?? null,
          },
        },
      }),
      4000,
      'updateUser-backup',
    );
  } catch {}

  // Cycles table — use authUserId, guaranteed to match auth.uid()
  const { data: inserted, error: cycleErr } = await withLockRetry(() =>
    supabase.from('cycles').upsert({
      id: entry.id,
      user_id: authUserId,
      start_date: entry.startDate,
      hebrew_date: entry.hebrewDate,
      onah: entry.onah,
    }, { onConflict: 'id' }).select().then((r) => r),
  );
  if (cycleErr) throw cycleErr;
  if (!inserted || inserted.length === 0) {
    throw new Error('הוסת לא נשמר. נסי להתנתק ולהתחבר שוב.');
  }

  // veset_dates — also use authUserId
  if (result.vesetDates.length > 0) {
    const rows = result.vesetDates.map((v) => ({
      cycle_id: entry.id,
      user_id: authUserId,
      date: v.date,
      type: v.type,
      onah: v.onah,
      is_fixed: v.isFixed,
    }));
    const { error: vesetErr } = await withLockRetry(() =>
      supabase.from('veset_dates').insert(rows).then((r) => r),
    );
    if (vesetErr) throw vesetErr;
  }
}

/** Fetch all veset_dates for the current user. */
export async function fetchVesetDates(userId: string): Promise<VesetDate[]> {
  const { data, error } = await supabase
    .from('veset_dates')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) throw error;
  return (data as VesetRow[]).map((r) => ({
    date: r.date,
    type: r.type,
    onah: r.onah,
    isFixed: r.is_fixed,
  }));
}

/** Save hefsek date for the latest cycle. */
export async function saveHefsek(cycleId: string, hefsekDate: string): Promise<void> {
  const { ensureSession, withLockRetry, withTimeout } = await import('./session');
  await withLockRetry(() => ensureSession());

  // Backup to user_metadata — time-boxed so a Web Locks hang in the iOS PWA
  // can't block the cycles.update below (see note in saveCycle).
  try {
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 4000, 'getUser-backup');
    const lastCycle = (user?.user_metadata as { last_cycle?: Record<string, unknown> } | null)?.last_cycle;
    if (lastCycle && lastCycle.id === cycleId) {
      await withTimeout(
        supabase.auth.updateUser({
          data: { last_cycle: { ...lastCycle, hefsek_date: hefsekDate } },
        }),
        4000,
        'updateUser-backup',
      );
    }
  } catch {}

  const { data, error } = await withLockRetry(() =>
    supabase
      .from('cycles')
      .update({ hefsek_date: hefsekDate })
      .eq('id', cycleId)
      .select()
      .then((r) => r),
  );
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('הפעולה לא נשמרה. נסי להתנתק ולהתחבר שוב.');
  }
}

/** Delete a cycle and its veset_dates (cascade handles the rest). */
export async function deleteCycle(cycleId: string): Promise<void> {
  const { error } = await supabase.from('cycles').delete().eq('id', cycleId);
  if (error) throw error;
}

/** Clear the hefsek date on a cycle (undo hefsek tahara). */
export async function clearHefsek(cycleId: string): Promise<void> {
  const { ensureSession } = await import('./session');
  await ensureSession();
  const { error } = await supabase
    .from('cycles')
    .update({ hefsek_date: null })
    .eq('id', cycleId);
  if (error) throw error;
}
