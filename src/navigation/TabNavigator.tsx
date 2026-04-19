import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { RootTabParamList } from './types';
import { colors } from '../config/theme';
import { HalachicProfile } from '../types/halachic';
import { useLanguage } from '../contexts/LanguageContext';

import CalendarScreen from '../screens/Calendar/CalendarScreen';
import AskExpertScreen from '../screens/AskExpert/AskExpertScreen';
import MikvehScreen from '../screens/Mikveh/MikvehScreen';
import ServicesScreen from '../screens/Services/ServicesScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const TAB_ICONS: Record<string, FeatherIconName> = {
  CalendarTab:  'calendar',
  AskExpertTab: 'message-circle',
  MikvehTab:    'droplet',
  ServicesTab:  'heart',
  ProfileTab:   'user',
};

interface TabNavigatorProps {
  halachicProfile?: HalachicProfile;
  biometricEnabled?: boolean;
}

export default function TabNavigator({
  halachicProfile = 'sephardi',
  biometricEnabled = false,
}: TabNavigatorProps) {
  const { t } = useLanguage();

  const TAB_LABELS: Record<string, string> = {
    CalendarTab:  t.tabCalendar,
    AskExpertTab: t.tabAskExpert,
    MikvehTab:    t.tabMikveh,
    ServicesTab:  t.tabServices,
    ProfileTab:   t.tabProfile,
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        lazy: true,
        headerShown: false,
        tabBarActiveTintColor: colors.primary.rose,
        tabBarInactiveTintColor: '#B0A8A0',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EDE8E3',
          height: 80,
          paddingTop: 8,
          paddingBottom: 12,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: -3 },
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarIcon: ({ color, focused }) => (
          <Feather
            name={TAB_ICONS[route.name]}
            size={focused ? 22 : 20}
            color={color}
          />
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

      <Tab.Screen name="MikvehTab">
        {() => <MikvehScreen halachicProfile={halachicProfile} />}
      </Tab.Screen>

      <Tab.Screen name="ServicesTab" component={ServicesScreen} />

      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
