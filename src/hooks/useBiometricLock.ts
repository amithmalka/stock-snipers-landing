import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricLockState {
  isUnlocked: boolean;
  isSupported: boolean;
  isAuthenticating: boolean;
  error: string | null;
}

export function useBiometricLock(enabled: boolean) {
  const [state, setState] = useState<BiometricLockState>({
    isUnlocked: !enabled,
    isSupported: false,
    isAuthenticating: false,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, isUnlocked: true }));
      return;
    }
    LocalAuthentication.hasHardwareAsync().then((supported) => {
      setState((s) => ({ ...s, isSupported: supported }));
      if (!supported) {
        // Fallback: allow access if biometrics unavailable
        setState((s) => ({ ...s, isUnlocked: true }));
      }
    });
  }, [enabled]);

  const authenticate = useCallback(async () => {
    if (!enabled || state.isUnlocked) return;
    setState((s) => ({ ...s, isAuthenticating: true, error: null }));
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'אמתי את זהותך כדי להיכנס ל-SIEL',
        cancelLabel: 'ביטול',
        fallbackLabel: 'השתמשי בסיסמה',
        disableDeviceFallback: false,
      });
      setState((s) => ({
        ...s,
        isAuthenticating: false,
        isUnlocked: result.success,
        error: result.success ? null : 'האימות נכשל. נסי שוב.',
      }));
    } catch {
      setState((s) => ({
        ...s,
        isAuthenticating: false,
        error: 'שגיאה בעת האימות הביומטרי',
      }));
    }
  }, [enabled, state.isUnlocked]);

  const lock = useCallback(() => {
    if (enabled) {
      setState((s) => ({ ...s, isUnlocked: false }));
    }
  }, [enabled]);

  return { ...state, authenticate, lock };
}
