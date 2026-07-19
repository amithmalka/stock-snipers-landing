import { supabase } from '../../config/supabase';

export type PrayerType = 'shacharit' | 'mincha' | 'arvit' | 'none';

export interface UserAppointment {
  id: string;
  providerName: string;
  slotStart: string;
  status: 'pending' | 'provider_confirmed' | 'cancelled';
}

export interface Kabbalah {
  id: string;
  text: string;
  createdAt: string;
}

// ─── Appointments ────────────────────────────────────────────────────────────

export async function fetchMyAppointments(userId: string): Promise<UserAppointment[]> {
  // PRIMARY: use backoffice API (bypasses RLS — service_role server-side)
  try {
    const url = `/api/public-my-appointments?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.appointments)) {
        return (json.appointments as Array<{ id: string; provider_name: string; slot_start: string; status: string }>)
          .map((a) => ({
            id: a.id,
            providerName: a.provider_name || 'בעלת עסק',
            slotStart: a.slot_start,
            status: a.status as UserAppointment['status'],
          }));
      }
    }
  } catch (e) {
    console.warn('[fetchMyAppointments] API failed, falling back to Supabase:', e);
  }

  // FALLBACK: direct Supabase
  const { ensureSession } = await import('./session');
  await ensureSession();
  const { data } = await supabase
    .from('appointments')
    .select('id, slot_start, status, provider_id')
    .eq('user_id', userId)
    .gte('slot_start', new Date().toISOString())
    .order('slot_start', { ascending: true })
    .limit(20);

  if (!data || data.length === 0) return [];

  const providerIds = [...new Set(data.map((r: { provider_id: string }) => r.provider_id))];
  const { data: providers } = await supabase
    .from('service_providers')
    .select('id, name')
    .in('id', providerIds);

  const nameMap = new Map(((providers ?? []) as Array<{ id: string; name: string }>).map((p) => [p.id, p.name]));

  return data.map((row: { id: string; provider_id: string; slot_start: string; status: string }) => ({
    id: row.id,
    providerName: nameMap.get(row.provider_id) ?? 'ספקית שירות',
    slotStart: row.slot_start,
    status: row.status as UserAppointment['status'],
  }));
}

// ─── Prayer reminders ─────────────────────────────────────────────────────────

export async function fetchPrayerReminder(userId: string): Promise<PrayerType> {
  const { ensureSession } = await import('./session');
  await ensureSession();
  const { data } = await supabase
    .from('prayer_reminders')
    .select('prayer_type')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.prayer_type as PrayerType) ?? 'none';
}

export async function savePrayerReminder(userId: string, type: PrayerType): Promise<void> {
  const { ensureSession, withLockRetry } = await import('./session');
  await withLockRetry(() => ensureSession());
  const { data, error } = await withLockRetry(() =>
    supabase
      .from('prayer_reminders')
      .upsert({ user_id: userId, prayer_type: type, updated_at: new Date().toISOString() })
      .select()
      .then((r) => r),
  );
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('הפעולה לא נשמרה. נסי להתנתק ולהתחבר שוב.');
  }
}

// ─── Kabbalot ─────────────────────────────────────────────────────────────────

export async function fetchKabbalot(userId: string): Promise<Kabbalah[]> {
  const { data } = await supabase
    .from('user_kabbalot')
    .select('id, text, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!data) return [];
  return data.map((row: any) => ({ id: row.id, text: row.text, createdAt: row.created_at }));
}

export async function addKabbalah(userId: string, text: string): Promise<Kabbalah | null> {
  const { data } = await supabase
    .from('user_kabbalot')
    .insert({ user_id: userId, text })
    .select('id, text, created_at')
    .single();
  if (!data) return null;
  return { id: data.id, text: data.text, createdAt: data.created_at };
}

export async function deleteKabbalah(id: string): Promise<void> {
  await supabase.from('user_kabbalot').delete().eq('id', id);
}
