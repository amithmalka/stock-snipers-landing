import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { HalachicProfile } from '../types/halachic';
import { colors } from '../config/theme';
import TabNavigator from './TabNavigator';
import LoginScreen from '../screens/Auth/LoginScreen';
import OnboardingScreen from '../screens/Auth/OnboardingScreen';

export default function AppNavigator() {
  const { session, user, isLoading, signOut, updateProfile } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Show a spinner while auth state is resolving
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral.beige }}>
        <ActivityIndicator size="large" color={colors.primary.gold} />
      </View>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <NavigationContainer>
        <LoginScreen onLogin={() => setNeedsOnboarding(true)} />
      </NavigationContainer>
    );
  }

  // Logged in but profile not yet created
  if (needsOnboarding || !user?.displayName) {
    return (
      <NavigationContainer>
        <OnboardingScreen onComplete={() => setNeedsOnboarding(false)} />
      </NavigationContainer>
    );
  }

  // Fully authenticated — show the app
  return (
    <NavigationContainer>
      <TabNavigator
        halachicProfile={user.halachicProfile}
        displayName={user.displayName}
        email={user.email}
        biometricEnabled={user.biometricEnabled}
        locationEnabled={user.locationEnabled}
        onSignOut={signOut}
        onUpdateProfile={(updates) =>
          updateProfile(updates as {
            halachicProfile?: HalachicProfile;
            biometricEnabled?: boolean;
            locationEnabled?: boolean;
          })
        }
      />
    </NavigationContainer>
  );
}
