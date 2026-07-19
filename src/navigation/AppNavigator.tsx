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
  const { session, user, isLoading, isDemoMode, refreshUser } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Detect first-time users: session exists but profile is missing or has no name
  useEffect(() => {
    if (isLoading || !session) return;
    // New signup: session exists but no profile row yet → onboarding
    if (user === null) {
      if (!needsOnboarding) setNeedsOnboarding(true);
      return;
    }
    if (!user.displayName) {
      if (!needsOnboarding) setNeedsOnboarding(true);
    } else {
      if (needsOnboarding) setNeedsOnboarding(false);
    }
  }, [isLoading, session, user, needsOnboarding]);

  // Show spinner while auth state is resolving
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
          <OnboardingScreen onComplete={async () => {
            await refreshUser();
            setNeedsOnboarding(false);
          }} />
        </NavigationContainer>
      );
    }
  }

  // Don't render the main TabNavigator until we have a user.id —
  // CalendarScreen and others use userId for DB writes; passing undefined
  // causes silent RLS failures. While we wait, show a brief spinner.
  // (For demo mode, fall through with default values.)
  if (!isDemoMode && !user?.id) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.beige }}>
        <ActivityIndicator size="large" color={colors.primary.gold} />
      </View>
    );
  }

  const activeUser = user ?? { halachicProfile: 'sephardi' as HalachicProfile, biometricEnabled: false };

  return (
    <NavigationContainer>
      <TabNavigator
        userId={user?.id}
        halachicProfile={activeUser.halachicProfile}
        biometricEnabled={activeUser.biometricEnabled}
      />
    </NavigationContainer>
  );
}
