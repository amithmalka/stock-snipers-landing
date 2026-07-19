import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/contexts/LanguageContext';
import InstallPWABanner from './src/components/InstallPWABanner';
import { initSentry } from './src/lib/sentry';
import { initPostHog } from './src/lib/posthog';

// Initialize observability as early as possible
initSentry();
initPostHog();

// Supabase auth throws "Unknown error: Could not connect to the server" as an
// unhandled rejection when the session-refresh network call fails in Expo Go.
// Suppress the dev overlay — the user is signed out gracefully via onAuthStateChange.
LogBox.ignoreLogs(['Unknown error: Could not connect']);

if (__DEV__) {
  const prevHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    if (error?.message?.includes('Could not connect')) return;
    prevHandler(error, isFatal);
  });
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Feather: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <StatusBar style="dark" />
        <AppNavigator />
        <InstallPWABanner />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
