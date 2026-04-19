import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { HalachicProfile } from '../../types/halachic';

interface ProfileScreenProps {
  displayName?: string;
  email?: string;
  halachicProfile?: HalachicProfile;
  biometricEnabled?: boolean;
  locationEnabled?: boolean;
  onUpdateProfile?: (updates: {
    halachicProfile?: HalachicProfile;
    biometricEnabled?: boolean;
    locationEnabled?: boolean;
  }) => void;
  onSignOut?: () => void;
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDesc}>{description}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.neutral.beigeDeep, true: colors.primary.gold }}
        thumbColor={colors.neutral.white}
      />
    </View>
  );
}

export default function ProfileScreen({
  displayName = 'אורחת',
  email = '',
  halachicProfile = 'sephardi',
  biometricEnabled = false,
  locationEnabled = true,
  onUpdateProfile,
  onSignOut,
}: ProfileScreenProps) {
  const [profile, setProfile] = useState<HalachicProfile>(halachicProfile);
  const [biometric, setBiometric] = useState(biometricEnabled);
  const [location, setLocation] = useState(locationEnabled);

  function updateProfile(updates: Parameters<NonNullable<typeof onUpdateProfile>>[0]) {
    onUpdateProfile?.(updates);
  }

  function handleProfileChange(p: HalachicProfile) {
    setProfile(p);
    updateProfile({ halachicProfile: p });
  }

  function handleBiometricChange(v: boolean) {
    setBiometric(v);
    updateProfile({ biometricEnabled: v });
  }

  function handleLocationChange(v: boolean) {
    setLocation(v);
    updateProfile({ locationEnabled: v });
  }

  function handleSignOut() {
    Alert.alert('יציאה', 'האם את בטוחה שברצונך להתנתק?', [
      { text: 'ביטול', style: 'cancel' },
      { text: 'התנתקי', style: 'destructive', onPress: onSignOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName[0] ?? '✨'}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          {email ? <Text style={styles.email}>{email}</Text> : null}
        </View>

        {/* Halachic profile */}
        <Text style={styles.sectionTitle}>הפרופיל ההלכתי</Text>
        <View style={styles.card}>
          {(['sephardi', 'ashkenazi'] as HalachicProfile[]).map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.profileOption}
                onPress={() => handleProfileChange(p)}
                activeOpacity={0.7}
              >
                <View style={styles.profileOptionLeft}>
                  <Text style={styles.profileOptionEmoji}>{p === 'sephardi' ? '🌙' : '⭐'}</Text>
                  <View>
                    <Text style={styles.profileOptionLabel}>
                      {p === 'sephardi' ? 'ספרדיה (מרן)' : 'אשכנזיה (רמ״א)'}
                    </Text>
                    <Text style={styles.profileOptionSub}>
                      {p === 'sephardi' ? 'עונה בינונית — יום 30' : 'עונה בינונית — ימים 30–31, אור זרוע'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radio, profile === p && styles.radioActive]}>
                  {profile === p && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* Privacy settings */}
        <Text style={styles.sectionTitle}>פרטיות ואבטחה</Text>
        <View style={styles.card}>
          <SettingRow
            icon="🔒"
            label="נעילה ביומטרית"
            description="Face ID / טביעת אצבע לפתיחת האפליקציה"
            value={biometric}
            onValueChange={handleBiometricChange}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="📍"
            label="שיתוף מיקום"
            description="לחישוב זמנים מדויקים ומציאת שירותים קרובים"
            value={location}
            onValueChange={handleLocationChange}
          />
        </View>

        {/* App info */}
        <Text style={styles.sectionTitle}>אודות</Text>
        <View style={styles.card}>
          {[
            { icon: '✨', label: 'גרסה', value: '1.0.0' },
            { icon: '📜', label: 'מדיניות פרטיות', value: '›' },
            { icon: '📋', label: 'תנאי שימוש', value: '›' },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>{item.icon}</Text>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>התנתקי</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>SIEL · כל הזכויות שמורות</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  profileHeader: { alignItems: 'center', padding: spacing.xl, paddingBottom: spacing.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.neutral.white },
  displayName: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral.text },
  email: { fontSize: typography.size.sm, color: colors.neutral.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.neutral.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  divider: { height: 0.5, backgroundColor: colors.neutral.beigeDeep, marginHorizontal: spacing.md },
  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  profileOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileOptionEmoji: { fontSize: 24 },
  profileOptionLabel: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text },
  profileOptionSub: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral.beigeDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary.gold },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary.gold },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  settingIcon: { fontSize: 22 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text, textAlign: 'right' },
  settingDesc: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2, textAlign: 'right' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  infoIcon: { fontSize: 18 },
  infoLabel: { flex: 1, fontSize: typography.size.md, color: colors.neutral.text, textAlign: 'right' },
  infoValue: { fontSize: typography.size.md, color: colors.neutral.textMuted },
  signOutBtn: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.status.alert,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  signOutText: { color: colors.status.alert, fontSize: typography.size.md, fontWeight: '600' },
  footer: {
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    paddingBottom: spacing.xl,
  },
});
