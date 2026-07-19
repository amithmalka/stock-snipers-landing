import { supabase } from '../../config/supabase';

/** Wrap any promise with a hard timeout so the UI never stays loading forever. */
export function withTimeout<T>(p: Promise<T>, ms = 8000, label = 'request'): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms)),
  ]);
}

/** Retry on transient Supabase auth-lock errors (Web Locks contention). */
export async function withLockRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const isTransient = msg.includes('lock') || msg.includes('stole') || msg.includes('NetworkError') || msg.includes('Failed to fetch');
      if (!isTransient) throw e;
      await new Promise((r) => setTimeout(r, 250 + i * 400));
    }
  }
  throw lastErr;
}

// Module-level session cache — populated by the auth listener in useAuth.
// This lets ensureSession() return the user id INSTANTLY without hitting the
// Web Locks contention that plagues getSession() on iOS Safari PWAs.
let cachedUserId: string | null = null;
let cachedExpiresAt: number | null = null;

export function setSessionCache(userId: string | null, expiresAt: number | null): void {
  cachedUserId = userId;
  cachedExpiresAt = expiresAt;
}

/**
 * Ensure we have a fresh, valid session before performing a write.
 * Uses an in-memory cache populated by the auth listener to avoid triggering
 * Web Locks contention on iOS Safari PWAs. Falls back to getSession() only
 * when no cache exists.
 */
export async function ensureSession(): Promise<string> {
  // Fast path — use the cached session from the auth listener. This avoids
  // getSession() entirely, which is the operation that hangs on PWAs.
  const now = Date.now();
  if (cachedUserId && cachedExpiresAt && cachedExpiresAt * 1000 > now + 60_000) {
    return cachedUserId;
  }

  // Slow path — no cache or nearly-expired. Use a generous 15s timeout.
  let session;
  try {
    const sessionResult = await withTimeout(supabase.auth.getSession(), 15_000, 'getSession');
    session = sessionResult.data.session;
  } catch (e) {
    // If getSession itself hangs but we have a cache from a previous life,
    // trust it. Better to attempt the write and let RLS reject than to
    // block the user entirely.
    if (cachedUserId) {
      console.warn('[session] getSession hung — falling back to cached user id');
      return cachedUserId;
    }
    throw e;
  }

  // If session expires within 60 seconds, refresh
  const needsRefresh = !session || (session.expires_at && (session.expires_at * 1000) - now < 60_000);

  if (needsRefresh) {
    try {
      const refreshResult = await withTimeout(supabase.auth.refreshSession(), 15_000, 'refreshSession');
      if (refreshResult.error || !refreshResult.data.session) {
        throw new Error('הסשן פג ולא הצלחנו לחדש אותו. נא להתנתק ולהתחבר שוב.');
      }
      session = refreshResult.data.session;
    } catch (e) {
      // Same fallback — cached id beats a hard failure.
      if (cachedUserId) {
        console.warn('[session] refreshSession hung — falling back to cached user id');
        return cachedUserId;
      }
      if (e instanceof Error && e.message.includes('timeout')) {
        throw new Error('חיבור הסשן לא מגיב. בדקי את החיבור לאינטרנט ונסי שוב.');
      }
      throw e;
    }
  }

  if (!session) throw new Error('אינך מחוברת. נא להתחבר מחדש.');
  cachedUserId = session.user.id;
  cachedExpiresAt = session.expires_at ?? null;
  return session.user.id;
}
