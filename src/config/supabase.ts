import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// True only when both env vars are properly set.
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 10;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const PLACEHOLDER_CLIENT = createClient(
  'https://placeholder.supabase.co',
  'placeholder-anon-key-not-real',
);

// createClient wrapped in try-catch: if it throws at module load time
// (bad key format, missing native module, etc.) the app still loads in demo mode.
function buildClient(): SupabaseClient {
  if (!isSupabaseConfigured) return PLACEHOLDER_CLIENT;
  try {
    // On web (PWA), let Supabase use its built-in localStorage adapter —
    // it's synchronous and fast. SecureStore on web adds async overhead
    // and can cause session persistence issues.
    const authOptions = Platform.OS === 'web'
      ? { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
      : { storage: ExpoSecureStoreAdapter, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false };
    return createClient(supabaseUrl, supabaseAnonKey, { auth: authOptions });
  } catch {
    return PLACEHOLDER_CLIENT;
  }
}

export const supabase: SupabaseClient = buildClient();

// If createClient fell back to placeholder, treat the app as unconfigured.
export const isSupabaseReady =
  isSupabaseConfigured && supabase !== PLACEHOLDER_CLIENT;
