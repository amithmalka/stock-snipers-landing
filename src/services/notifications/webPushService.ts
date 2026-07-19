import { Platform } from 'react-native';
import { supabase } from '../../config/supabase';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type WebPushStatus =
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'misconfigured'
  | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export async function subscribeToWebPush(userId: string): Promise<WebPushStatus> {
  if (Platform.OS !== 'web') return 'unsupported';
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (!VAPID_PUBLIC_KEY) return 'misconfigured';

  function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`${label} timeout`)), ms)),
    ]);
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    // SW ready can hang if SW failed to register — timeout in 5s
    const reg = await withTimeout(navigator.serviceWorker.ready, 5000, 'sw-ready');
    let sub = await withTimeout(reg.pushManager.getSubscription(), 3000, 'get-sub');
    if (!sub) {
      sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }),
        8000,
        'subscribe',
      );
    }

    const { error } = await withTimeout(
      supabase.from('user_push_subscriptions').upsert({
        user_id: userId,
        subscription: sub.toJSON(),
        updated_at: new Date().toISOString(),
      }).then((r) => r),
      5000,
      'upsert',
    );
    if (error) return 'error';
    return 'subscribed';
  } catch (e) {
    console.error('[webPush] failed:', e);
    return 'error';
  }
}

export function getWebPushPermission(): NotificationPermission | 'unsupported' {
  if (Platform.OS !== 'web') return 'unsupported';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}
