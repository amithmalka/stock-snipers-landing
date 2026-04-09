import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootTabParamList } from './types';
import { colors, typography } from '../config/theme';

import CalendarScreen from '../screens/Calendar/CalendarScreen';
import AskExpertScreen from '../screens/AskExpert/AskExpertScreen';
import ServicesScreen from '../screens/Services/ServicesScreen';
import CommunityScreen from '../screens/Community/CommunityScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
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
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{ tabBarLabel: 'Calendar' }}
      />
      <Tab.Screen
        name="AskExpertTab"
        component={AskExpertScreen}
        options={{ tabBarLabel: 'Ask Expert' }}
      />
      <Tab.Screen
        name="ServicesTab"
        component={ServicesScreen}
        options={{ tabBarLabel: 'Services' }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={CommunityScreen}
        options={{ tabBarLabel: 'Community' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
