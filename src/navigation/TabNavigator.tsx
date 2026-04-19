import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from './types';
import { colors, typography } from '../config/theme';
import { HalachicProfile } from '../types/halachic';

import CalendarScreen from '../screens/Calendar/CalendarScreen';
import AskExpertScreen from '../screens/AskExpert/AskExpertScreen';
import ServicesScreen from '../screens/Services/ServicesScreen';
import CommunityScreen from '../screens/Community/CommunityScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<string, string> = {
  CalendarTab:  '📅',
  AskExpertTab: '💬',
  ServicesTab:  '💅',
  CommunityTab: '🌸',
  ProfileTab:   '👤',
};

const TAB_LABELS: Record<string, string> = {
  CalendarTab:  'לוח',
  AskExpertTab: 'שאלי רב',
  ServicesTab:  'שירותים',
  CommunityTab: 'קהילה',
  ProfileTab:   'פרופיל',
};

interface TabNavigatorProps {
  halachicProfile?: HalachicProfile;
  displayName?: string;
  email?: string;
  biometricEnabled?: boolean;
  locationEnabled?: boolean;
  onSignOut?: () => void;
  onUpdateProfile?: (updates: {
    halachicProfile?: HalachicProfile;
    biometricEnabled?: boolean;
    locationEnabled?: boolean;
  }) => void;
}

export default function TabNavigator({
  halachicProfile = 'sephardi',
  displayName = '',
  email = '',
  biometricEnabled = false,
  locationEnabled = true,
  onSignOut,
  onUpdateProfile,
}: TabNavigatorProps) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary.gold,
        tabBarInactiveTintColor: colors.neutral.textMuted,
        tabBarStyle: {
          backgroundColor: colors.neutral.white,
          borderTopColor: colors.neutral.beigeDeep,
          borderTopWidth: 0.5,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: typography.size.xs,
          fontWeight: '600',
        },
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarIcon: () => (
          <Text style={{ fontSize: 22 }}>{TAB_ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="CalendarTab">
        {() => (
          <CalendarScreen
            halachicProfile={halachicProfile}
            biometricEnabled={biometricEnabled}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="AskExpertTab">
        {() => <AskExpertScreen halachicProfile={halachicProfile} />}
      </Tab.Screen>

      <Tab.Screen name="ServicesTab" component={ServicesScreen} />

      <Tab.Screen name="CommunityTab" component={CommunityScreen} />

      <Tab.Screen name="ProfileTab">
        {() => (
          <ProfileScreen
            displayName={displayName}
            email={email}
            halachicProfile={halachicProfile}
            biometricEnabled={biometricEnabled}
            locationEnabled={locationEnabled}
            onUpdateProfile={onUpdateProfile}
            onSignOut={onSignOut}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
