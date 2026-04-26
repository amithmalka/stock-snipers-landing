import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox, Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/contexts/LanguageContext';

function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      const w = window as any;
      const isStandalone = w.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone;
      if (!isStandalone) setVisible(true);
    } catch {}
  }, []);

  if (!visible) return null;

  const isIOS = Platform.OS === 'web' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  function dismiss() {
    setVisible(false);
  }

  return (
    <View style={banner.overlay}>
      <View style={banner.popup}>
        <Text style={banner.emoji}>📲</Text>
        <Text style={banner.title}>הוסיפי לסכך הבית</Text>
        <Text style={banner.body}>
          כדי לקבל חוויה מלאה כמו אפליקציה אמיתית — התקיני את סיאל על המסך הראשי שלך:
        </Text>

        {isIOS ? (
          <View style={banner.steps}>
            <Text style={banner.step}>1. לחצי על כפתור השיתוף <Text style={banner.bold}>⎋</Text> בסרגל Safari</Text>
            <Text style={banner.step}>2. גללי מטה ובחרי <Text style={banner.bold}>"Add to Home Screen" / "הוסף למסך הבית"</Text></Text>
            <Text style={banner.step}>3. לחצי <Text style={banner.bold}>Add / הוסף</Text> בפינה הימנית</Text>
          </View>
        ) : (
          <View style={banner.steps}>
            <Text style={banner.step}>1. פתחי את תפריט Chrome (שלוש הנקודות ⋮)</Text>
            <Text style={banner.step}>2. בחרי <Text style={banner.bold}>"Add to Home Screen" / "הוסף לדף הבית"</Text></Text>
            <Text style={banner.step}>3. אשרי והתקיני</Text>
          </View>
        )}

        <TouchableOpacity style={banner.btn} onPress={dismiss} activeOpacity={0.85}>
          <Text style={banner.btnText}>הבנתי!</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss}>
          <Text style={banner.skip}>אולי מאוחר יותר</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const banner = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  popup: {
    backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  emoji: { fontSize: 42, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#2D1F0E', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 14, color: '#7A6A5A', textAlign: 'center', lineHeight: 22, marginBottom: 18 },
  steps: { width: '100%', marginBottom: 22, gap: 8 },
  step: { fontSize: 13, color: '#4A3728', lineHeight: 20, textAlign: 'right' },
  bold: { fontWeight: '700', color: '#2D1F0E' },
  btn: {
    backgroundColor: '#C4849A', borderRadius: 14, paddingVertical: 13,
    paddingHorizontal: 40, alignItems: 'center', marginBottom: 10,
  },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  skip: { fontSize: 12, color: '#A0906A', textDecorationLine: 'underline' },
});

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
        <InstallBanner />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
