import { Platform } from 'react-native';

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;
type PostHogJs = {
  init: (key: string, opts: Record<string, unknown>) => void;
  capture: (event: string, props?: Record<string, unknown>) => void;
  identify: (id: string, props?: Record<string, unknown>) => void;
  reset: () => void;
  register: (props: Record<string, unknown>) => void;
};
let ph: PostHogJs | null = null;

export function initPostHog() {
  if (initialized) return;
  if (Platform.OS !== 'web') return;
  if (!KEY) return;
  if (typeof window === 'undefined') return;
  try {
    // posthog-js is web-only; lazy require so RN bundler doesn't try to resolve it
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('posthog-js');
    ph = (mod.default ?? mod) as PostHogJs;
    ph.init(KEY, {
      api_host: HOST,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      person_profiles: 'identified_only',
      persistence: 'localStorage+cookie',
      autocapture: true,
      disable_session_recording: true,
      loaded: (loaded: PostHogJs) => {
        loaded.register({ app: 'consumer' });
      },
    });
    initialized = true;
  } catch {
    // ignore — analytics is optional
  }
}

export function identifyUser(id: string, props?: Record<string, unknown>) {
  if (!ph) return;
  try {
    ph.identify(id, props);
  } catch {}
}

export function resetUser() {
  if (!ph) return;
  try {
    ph.reset();
  } catch {}
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!ph) return;
  try {
    ph.capture(event, props);
  } catch {}
}
