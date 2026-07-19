// Web stub – biometric auth not available in browser
import { useCallback } from 'react';

export function useBiometricLock(_enabled: boolean) {
  return {
    isUnlocked: true,
    isSupported: false,
    isAuthenticating: false,
    error: null,
    authenticate: useCallback(async () => {}, []),
    lock: useCallback(() => {}, []),
  };
}
