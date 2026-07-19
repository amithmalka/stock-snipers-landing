import React from 'react';
import { Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootTabParamList } from './types';
import { colors } from '../config/theme';
import { HalachicProfile } from '../types/halachic';
import { useLanguage } from '../contexts/LanguageContext';
import { TabIcon } from './TabIcon';

import CalendarScreen from '../screens/Calendar/CalendarScreen';
import AskExpertScreen from '../screens/AskExpert/AskExpertScreen';
import MikvehScreen from '../screens/Mikveh/MikvehScreen';
import CommunityScreen from '../screens/Community/CommunityScreen';
import ServicesScreen from '../screens/Services/ServicesScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICON_NAME: Record<string, 'calendar' | 'message' | 'droplet' | 'users' | 'heart' | 'user'> = {
  CalendarTab:  'calendar',
  AskExpertTab: 'message',
  MikvehTab:    'droplet',
  CommunityTab: 'users',
  ServicesTab:  'heart',
  ProfileTab:   'user',
};

interface TabNavigatorProps {
  userId?: string;
  halachicProfile?: HalachicProfile;
  biometricEnabled?: boolean;
}

export default function TabNavigator({
  userId,
  halachicProfile = 'sephardi',
  biometricEnabled = false,
}: TabNavigatorProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const TAB_LABELS: Record<string, string> = {
    CalendarTab:  t.tabCalendar,
    AskExpertTab: t.tabAskExpert,
    MikvehTab:    t.tabMikveh,
    CommunityTab: t.tabCommunity,
    ServicesTab:  t.tabServices,
    ProfileTab:   t.tabProfile,
  };

  const isWeb = Platform.OS === 'web';
  const bottomPadding = isWeb
    ? Math.max(insets.bottom, 6)
    : Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 8);
  const sidePadding = Math.max(insets.left, insets.right, 6);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        lazy: true,
        headerShown: false,
        tabBarActiveTintColor: colors.primary.rose,
        tabBarInactiveTintColor: '#B0A8A0',
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: '#F3EDE4',
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          paddingLeft: sidePadding,
          paddingRight: sidePadding,
        },
        tabBarItemStyle: {
          flex: 1,
          paddingHorizontal: 0,
          paddingVertical: 0,
          minWidth: 0,
          maxWidth: '100%',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
          marginBottom: 2,
          paddingHorizontal: 0,
          textAlign: 'center',
          includeFontPadding: false,
          lineHeight: 12,
        },
        tabBarAllowFontScaling: false,
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarIconStyle: { height: 24, marginTop: 0 },
        tabBarIcon: ({ focused }) => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 22,
            borderRadius: 11,
            backgroundColor: focused ? '#FDEEF1' : 'transparent',
          }}>
            <TabIcon
              name={TAB_ICON_NAME[route.name]}
              size={focused ? 17 : 16}
              color={focused ? colors.primary.rose : '#B0A8A0'}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="CalendarTab">
        {() => (
          <CalendarScreen
            userId={userId}
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

      <Tab.Screen name="CommunityTab" component={CommunityScreen} />

      <Tab.Screen name="ServicesTab" component={ServicesScreen} />

      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
