import { Platform } from 'react-native';
import * as Sentry from '@sentry/browser';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (Platform.OS !== 'web') return;
  if (!DSN) return;
  if (__DEV__) return; // Don't send dev errors

  // Defensive global handler for the in-app-browser noise: when a Supabase
  // promise rejects with the {code, message} envelope and nothing caught it,
  // swallow it so the browser doesn't surface it (and Sentry doesn't capture).
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason as { code?: unknown; message?: unknown } | undefined;
      if (
        r &&
        typeof r === 'object' &&
        'code' in r &&
        'message' in r &&
        !(r instanceof Error)
      ) {
        e.preventDefault();
      }
    });
  }

  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    initialScope: { tags: { app: 'consumer' } },
    // Filter out noisy errors that aren't actionable
    ignoreErrors: [
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      'AbortError',
      'Non-Error promise rejection captured',
      // Supabase/PostgREST rejections that escape a missing .catch — the
      // wrapped value is `{ code, message }`. Sentry stringifies it as
      // "Object captured as promise rejection". Not actionable in aggregate.
      'Object captured as promise rejection',
      /lock.*was released because another request stole it/,
      // Meta's in-app browser (Instagram/Facebook) injects its own bridge
      // script into every page it loads. That script talks to the native app
      // through window.webkit.messageHandlers and throws when the handler
      // isn't there — on pagehide, for anyone arriving from a social link.
      // It is Meta's code running in our page, not ours: nothing breaks for
      // the user and there is nothing for us to fix.
      /webkit\.messageHandlers/,
    ],
    // Don't send PII (personal data)
    beforeSend(event, hint) {
      if (event.request?.cookies) delete event.request.cookies;
      // Last-resort filter for the in-app-browser noise: drop events whose
      // original throw value looks like a Supabase error envelope.
      const orig = hint?.originalException as { code?: unknown; message?: unknown } | undefined;
      if (
        orig &&
        typeof orig === 'object' &&
        'code' in orig &&
        'message' in orig &&
        !(orig instanceof Error)
      ) {
        return null;
      }
      return event;
    },
  });
  initialized = true;
}
