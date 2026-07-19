import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 10;

// Use localStorage on web instead of SecureStore
const LocalStorageAdapter = {
  getItem: (key: string): string | null => localStorage.getItem(key),
  setItem: (key: string, value: string): void => localStorage.setItem(key, value),
  removeItem: (key: string): void => localStorage.removeItem(key),
};

const PLACEHOLDER_CLIENT = createClient(
  'https://placeholder.supabase.co',
  'placeholder-anon-key-not-real',
);

function buildClient(): SupabaseClient {
  if (!isSupabaseConfigured) return PLACEHOLDER_CLIENT;
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: LocalStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch {
    return PLACEHOLDER_CLIENT;
  }
}

export const supabase: SupabaseClient = buildClient();

export const isSupabaseReady =
  isSupabaseConfigured && supabase !== PLACEHOLDER_CLIENT;
