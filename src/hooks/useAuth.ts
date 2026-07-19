import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured, isSupabaseReady } from '../config/supabase';
import { HalachicProfile } from '../types/halachic';
import { Session } from '@supabase/supabase-js';
import { registerForPushNotifications } from '../services/notifications/notificationsService';
import { identifyUser, resetUser } from '../lib/posthog';
import { setSessionCache } from '../services/supabase/session';

const PROFILE_CACHE_KEY = 'siel_cached_user';

function getCachedUser(): AppUser | null {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch { return null; }
}

function setCachedUser(user: AppUser | null) {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    if (user) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  halachicProfile: HalachicProfile;
  biometricEnabled: boolean;
  locationEnabled: boolean;
}

// Demo user shown when Supabase is not configured
const DEMO_USER: AppUser = {
  id: 'demo',
  email: 'demo@siel.app',
  displayName: 'משתמשת דמו',
  phone: '',
  halachicProfile: 'sephardi',
  biometricEnabled: false,
  locationEnabled: true,
};

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  isDemoMode: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    const cachedUser = getCachedUser();
    return {
      session: null,
      // On web: use cached profile immediately so the app shows without a spinner
      user: cachedUser,
      isLoading: cachedUser === null,
      isDemoMode: !isSupabaseConfigured,
    };
  });

  useEffect(() => {
    // Demo mode: skip Supabase, go straight to app with a demo user
    if (!isSupabaseReady) {
      setState({ session: null, user: DEMO_USER, isLoading: false, isDemoMode: true });
      return;
    }

    const fallbackToDemo = () =>
      setState({ session: null, user: DEMO_USER, isLoading: false, isDemoMode: true });

    // Hard timeout: if onAuthStateChange never fires, we still need to
    // unblock the UI. But unlike before, when this timer fires we ALSO
    // surface the latest known session if any — so we don't end up in
    // a "isLoading=false but session/user=null" race window.
    let authResolved = false;
    const loadingSafety = setTimeout(async () => {
      if (authResolved) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const user = await fetchUser(session);
          setCachedUser(user);
          setState({ session, user, isLoading: false, isDemoMode: false });
          identifyUser(session.user.id, { email: session.user.email });
          return;
        }
      } catch {}
      setState((prev) => prev.isLoading ? { ...prev, isLoading: false } : prev);
    }, 5000);

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // PRE-WARM session at app start, but only refresh if it's actually
      // close to expiry. Refreshing on every cold start was adding 1-3s of
      // network wait to every app open.
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const expiresInMs = expiresAt - Date.now();
        // Only refresh if expires within 5 minutes
        if (expiresAt && expiresInMs < 5 * 60 * 1000) {
          try { await supabase.auth.refreshSession(); } catch {}
        }

        // Retry any pending onboarding writes that failed on a previous run.
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem('siel.pendingOnboarding');
            if (raw) {
              const pending = JSON.parse(raw);
              if (pending && pending.displayName) {
                await supabase.from('profiles').upsert({
                  id: session.user.id,
                  display_name: pending.displayName,
                  halachic_profile: pending.halachicProfile,
                  biometric_enabled: pending.biometricEnabled,
                  location_enabled: pending.locationEnabled,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'id' });
                if (pending.prayerType) {
                  await supabase.from('prayer_reminders').upsert({
                    user_id: session.user.id,
                    prayer_type: pending.prayerType,
                    updated_at: new Date().toISOString(),
                  }, { onConflict: 'user_id' });
                }
                window.localStorage.removeItem('siel.pendingOnboarding');
              }
            }
          }
        } catch {}
      }).catch(() => {});

      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        authResolved = true;
        // Populate the module-level session cache used by ensureSession()
        // to avoid getSession() Web Locks contention on iOS Safari PWAs.
        setSessionCache(session?.user.id ?? null, session?.expires_at ?? null);
        try {
          if (session) {
            if (event === 'INITIAL_SESSION') {
              const cached = getCachedUser();
              if (cached) {
                setState({ session, user: cached, isLoading: false, isDemoMode: false });
                identifyUser(session.user.id, { email: session.user.email });
                registerForPushNotifications().then((token) => {
                  if (token) {
                    supabase.from('user_push_tokens').upsert({ user_id: session.user.id, token, updated_at: new Date().toISOString() }).then(() => {});
                  }
                }).catch(() => {});
                return;
              }
            }
            const user = await fetchUser(session);
            setCachedUser(user);
            setState({ session, user, isLoading: false, isDemoMode: false });
            identifyUser(session.user.id, { email: session.user.email });
            registerForPushNotifications().then((token) => {
              if (token) {
                supabase.from('user_push_tokens').upsert({ user_id: session.user.id, token, updated_at: new Date().toISOString() }).then(() => {});
              }
            }).catch(() => {});
          } else {
            setCachedUser(null);
            setState({ session: null, user: null, isLoading: false, isDemoMode: false });
            resetUser();
          }
        } catch {
          fallbackToDemo();
        }
      });
      subscription = data.subscription;
    } catch {
      fallbackToDemo();
    }

    // Refresh session when app becomes visible (e.g. user returns from home screen)
    const onVisibilityChange = () => {
      if (Platform.OS !== 'web' || typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        supabase.auth.refreshSession().catch(() => {});
      }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      clearTimeout(loadingSafety);
      subscription?.unsubscribe();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, []);

  async function fetchUser(session: Session): Promise<AppUser | null> {
    // PRIMARY: read from auth.users.user_metadata — no DB query, no RLS.
    // The user wrote their data here during onboarding via updateUser.
    const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>;
    const metaName = typeof meta.display_name === 'string' ? meta.display_name : '';

    async function readProfile() {
      return supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
    }

    function readLocalFallback(): string {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return '';
        const raw = window.localStorage.getItem('siel.pendingOnboarding');
        if (!raw) return '';
        const p = JSON.parse(raw);
        return typeof p?.displayName === 'string' ? p.displayName : '';
      } catch { return ''; }
    }

    // Try DB profile too (so phone/extra fields populate when available)
    let profileData: Record<string, unknown> | null = null;
    try {
      const { data } = await readProfile();
      if (data) profileData = data as Record<string, unknown>;
    } catch {}

    const displayName =
      (profileData?.display_name as string | undefined) ||
      metaName ||
      readLocalFallback();

    // If we have ANY signal that this user has onboarded (any name source),
    // return a populated AppUser. Otherwise return null → trigger onboarding.
    if (!displayName) return null;

    return {
      id: session.user.id,
      email: session.user.email ?? '',
      displayName,
      phone: (profileData?.phone as string) ?? '',
      halachicProfile: (profileData?.halachic_profile as 'sephardi' | 'ashkenazi')
        ?? (meta.halachic_profile as 'sephardi' | 'ashkenazi')
        ?? 'sephardi',
      biometricEnabled: profileData
        ? !!profileData.biometric_enabled
        : !!meta.biometric_enabled,
      locationEnabled: profileData
        ? profileData.location_enabled !== false
        : meta.location_enabled !== false,
    };
  }

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    setCachedUser(null);
    setState({ session: null, user: null, isLoading: false, isDemoMode: false });

    if (typeof localStorage !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('sb-') || k.includes('supabase')) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
    }

    if (isSupabaseConfigured) {
      supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }

    // On web (PWA), force a hard reload so all React state resets to a clean
    // login screen. Multiple useAuth() callers can hold stale state otherwise.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      setTimeout(() => { window.location.replace('/'); }, 80);
    }
  }

  async function updateProfile(updates: Partial<AppUser>) {
    // In demo mode just update local state
    if (!isSupabaseConfigured) {
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...updates } : null,
      }));
      return;
    }
    if (!state.session) return;
    const mapped: Record<string, unknown> = {};
    if (updates.displayName !== undefined) mapped.display_name = updates.displayName;
    if (updates.phone !== undefined) mapped.phone = updates.phone;
    if (updates.halachicProfile !== undefined) mapped.halachic_profile = updates.halachicProfile;
    if (updates.biometricEnabled !== undefined) mapped.biometric_enabled = updates.biometricEnabled;
    if (updates.locationEnabled !== undefined) mapped.location_enabled = updates.locationEnabled;

    const { error } = await supabase
      .from('profiles')
      .update(mapped)
      .eq('id', state.session.user.id);
    if (error) throw error;

    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  }

  async function refreshUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const user = await fetchUser(session);
      if (user) {
        setCachedUser(user);
        setState({ session, user, isLoading: false, isDemoMode: false });
      }
    } catch {}
  }

  return { ...state, signIn, signUp, signOut, updateProfile, refreshUser };
}
