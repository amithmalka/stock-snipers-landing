import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { HalachicProfile } from '../types/halachic';
import { colors } from '../config/theme';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/Auth/LoginScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';

export default function AppNavigator() {
  const { session, user, isLoading, isDemoMode } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Detect first-time users: session exists but no display name yet
  useEffect(() => {
    if (!isLoading && session && user !== null && !user.displayName && !needsOnboarding) {
      setNeedsOnboarding(true);
    }
  }, [isLoading, session, user]);

  // Show a spinner while auth state is resolving
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.beige }}>
        <ActivityIndicator size="large" color={colors.primary.gold} />
      </View>
    );
  }

  // Reset password flow: user clicked link from email
  const isResetPassword = Platform.OS === 'web' && typeof window !== 'undefined' && window.location.pathname === '/reset-password';
  if (isResetPassword) {
    return (
      <NavigationContainer>
        <ResetPasswordScreen />
      </NavigationContainer>
    );
  }

  // Demo mode — skip auth entirely, go straight to the app
  // Real auth flow only when Supabase is configured
  if (!isDemoMode) {
    // Show login only when we've confirmed there's no session AND no cached user.
    // A cached user (session=null, user!=null) means we're still verifying in background.
    if (!session && !user) {
      return (
        <NavigationContainer>
          <LoginScreen onLogin={() => setNeedsOnboarding(true)} />
        </NavigationContainer>
      );
    }

    if (needsOnboarding) {
      return (
        <NavigationContainer>
          <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
        </NavigationContainer>
      );
    }
  }

  // Fully authenticated (or demo mode) — show the app
  const activeUser = user ?? { halachicProfile: 'sephardi' as HalachicProfile, biometricEnabled: false };

  return (
    <NavigationContainer>
      <TabNavigator
        halachicProfile={activeUser.halachicProfile}
        biometricEnabled={activeUser.biometricEnabled}
      />
    </NavigationContainer>
  );
}
