import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured, isSupabaseReady } from '../config/supabase';
import { HalachicProfile } from '../types/halachic';
import { Session } from '@supabase/supabase-js';
import { registerForPushNotifications } from '../services/notifications/notificationsService';

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
  halachicProfile: HalachicProfile;
  biometricEnabled: boolean;
  locationEnabled: boolean;
}

// Demo user shown when Supabase is not configured
const DEMO_USER: AppUser = {
  id: 'demo',
  email: 'demo@siel.app',
  displayName: 'משתמשת דמו',
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

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      // Use onAuthStateChange as the single source of truth.
      // On web with localStorage, INITIAL_SESSION fires synchronously with the
      // stored session — no need for a separate getSession() call.
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (session) {
            if (event === 'INITIAL_SESSION') {
              // If we already have a cached user, use it immediately — skip the
              // DB fetch so the app is instant. The cache was written on last login.
              const cached = getCachedUser();
              if (cached) {
                setState({ session, user: cached, isLoading: false, isDemoMode: false });
                return;
              }
            }
            // For SIGNED_IN or no cache: fetch fresh profile from DB
            const user = await fetchUser(session);
            setCachedUser(user);
            setState({ session, user, isLoading: false, isDemoMode: false });
            if (event === 'SIGNED_IN') {
              registerForPushNotifications().then((token) => {
                if (token) {
                  supabase.from('user_push_tokens').upsert({ user_id: session.user.id, token, updated_at: new Date().toISOString() }).then(() => {});
                }
              }).catch(() => {});
            }
          } else {
            // No session (INITIAL_SESSION with null, or SIGNED_OUT)
            setCachedUser(null);
            setState({ session: null, user: null, isLoading: false, isDemoMode: false });
          }
        } catch {
          fallbackToDemo();
        }
      });
      subscription = data.subscription;
    } catch {
      fallbackToDemo();
    }

    return () => subscription?.unsubscribe();
  }, []);

  async function fetchUser(session: Session): Promise<AppUser | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (error || !data) return null;
      return {
        id: session.user.id,
        email: session.user.email ?? '',
        displayName: data.display_name ?? '',
        halachicProfile: data.halachic_profile ?? 'sephardi',
        biometricEnabled: data.biometric_enabled ?? false,
        locationEnabled: data.location_enabled ?? true,
      };
    } catch {
      return null;
    }
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
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch {}
    setCachedUser(null);
    setState({ session: null, user: null, isLoading: false, isDemoMode: false });
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

  return { ...state, signIn, signUp, signOut, updateProfile };
}
