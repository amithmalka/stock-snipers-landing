import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { HalachicProfile } from '../types/halachic';
import { Session } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  halachicProfile: HalachicProfile;
  biometricEnabled: boolean;
  locationEnabled: boolean;
}

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUser(session).then((user) =>
          setState({ session, user, isLoading: false })
        );
      } else {
        setState({ session: null, user: null, isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          const user = await fetchUser(session);
          setState({ session, user, isLoading: false });
        } else {
          setState({ session: null, user: null, isLoading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateProfile(updates: Partial<AppUser>) {
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
