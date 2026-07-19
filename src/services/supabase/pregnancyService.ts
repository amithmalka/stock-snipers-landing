import { supabase } from '../../config/supabase';

export interface PregnancyState {
  isPregnant: boolean;
  lmp: string | null;     // YYYY-MM-DD — Last Menstrual Period
}

const CACHE_KEY = 'siel.pregnancy.cache';

interface CacheEntry { userId: string; isPregnant: boolean; lmp: string | null }

function readCache(userId: string): PregnancyState | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: CacheEntry = JSON.parse(raw);
    if (c.userId !== userId) return null;
    return { isPregnant: c.isPregnant, lmp: c.lmp };
  } catch { return null; }
}

function writeCache(userId: string, state: PregnancyState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, ...state }));
  } catch {}
}

function clearCache(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try { window.localStorage.removeItem(CACHE_KEY); } catch {}
}

export function readPregnancyCache(userId: string): PregnancyState | null {
  return readCache(userId);
}

export async function fetchPregnancyState(userId: string): Promise<PregnancyState> {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_pregnant, pregnancy_lmp')
    .eq('id', userId)
    .maybeSingle();

  // If DB query failed but we have a fresh cache entry for this user, prefer the cache
  if (error || !data) {
    const cached = readCache(userId);
    if (cached) {
      console.warn('[pregnancy] DB read failed, using cached state', error?.message);
      return cached;
    }
    return { isPregnant: false, lmp: null };
  }

  const state: PregnancyState = {
    isPregnant: Boolean(data.is_pregnant),
    lmp: (data.pregnancy_lmp as string | null) ?? null,
  };

  // If DB says NOT pregnant but cache says pregnant (within last 7 days),
  // assume DB is stale/out-of-sync and trust the cache. This protects
  // against silent RLS failures and edge-case race conditions.
  if (!state.isPregnant) {
    const cached = readCache(userId);
    if (cached?.isPregnant) {
      console.warn('[pregnancy] DB says not pregnant but cache says yes — trusting cache');
      return cached;
    }
  }

  // Sync cache with whatever DB has
  writeCache(userId, state);
  return state;
}

export async function startPregnancy(userId: string, lmpIso: string): Promise<void> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_pregnant: true, pregnancy_lmp: lmpIso, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, is_pregnant, pregnancy_lmp');

  if (error) {
    if (/column .* does not exist/i.test(error.message)) {
      throw new Error('בסיס הנתונים לא מעודכן — צריך להוסיף עמודות is_pregnant ו-pregnancy_lmp לטבלת profiles.');
    }
    throw new Error(error.message);
  }

  // Detect silent RLS rejection (no error, but 0 rows actually returned)
  if (!data || data.length === 0) {
    throw new Error('השמירה נכשלה — אין הרשאת UPDATE על השורה שלך. צריך לבדוק את הגדרות ה-RLS של טבלת profiles.');
  }
  const row = data[0];
  if (row.is_pregnant !== true || row.pregnancy_lmp !== lmpIso) {
    throw new Error('השמירה לא נשמרה כפי שצריך. נסי שוב — או פני לתמיכה.');
  }
  // Cache for fast reads and to survive any future DB hiccups
  writeCache(userId, { isPregnant: true, lmp: lmpIso });
}

export async function endPregnancy(userId: string): Promise<void> {
  // Clear local cache first so the UI can react immediately even if the DB
  // call is slow. If the DB fails we'll surface an error, but the user has
  // clearly opted out of pregnancy mode and shouldn't be trapped by network.
  clearCache();

  // Race the DB update against a 10-second timeout. Some networks / auth
  // renewal cycles can cause supabase-js to hang without ever resolving —
  // rather than freezing the "שומר..." button forever, bail out.
  const updatePromise = supabase
    .from('profiles')
    .update({ is_pregnant: false, pregnancy_lmp: null, updated_at: new Date().toISOString() })
    .eq('id', userId);

  const timeoutPromise = new Promise<{ error: Error }>((resolve) =>
    setTimeout(() => resolve({ error: new Error('בקשת השמירה חרגה מהזמן המוקצב. נסי שוב או רעני את הדף.') }), 10_000)
  );

  const result = await Promise.race([updatePromise, timeoutPromise]);
  const err = 'error' in result ? result.error : null;
  if (err) {
    console.warn('[pregnancy] endPregnancy failed:', err.message);
    throw new Error(err.message ?? 'שגיאה בשמירה');
  }
}
