import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { Rabbi } from '../../types/models';
import { HalachicProfile } from '../../types/halachic';
import ChatScreen from './ChatScreen';

const DEMO_RABBIS: Rabbi[] = [
  { id: 'r1', name: 'הרב משה כהן', specialty: 'sephardi', isAvailable: true },
  { id: 'r2', name: 'הרבנית שרה לוי', specialty: 'sephardi', isAvailable: true },
  { id: 'r3', name: 'הרב אברהם גולדברג', specialty: 'ashkenazi', isAvailable: false },
  { id: 'r4', name: 'הרבנית מרים רוזנברג', specialty: 'ashkenazi', isAvailable: true },
];

interface AskExpertScreenProps {
  halachicProfile?: HalachicProfile;
}

export default function AskExpertScreen({ halachicProfile = 'sephardi' }: AskExpertScreenProps) {
  const [selectedRabbi, setSelectedRabbi] = useState<Rabbi | null>(null);

  const filteredRabbis = DEMO_RABBIS.filter((r) => r.specialty === halachicProfile);

  if (selectedRabbi) {
    return <ChatScreen rabbi={selectedRabbi} onBack={() => setSelectedRabbi(null)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>שאלי מומחה</Text>
          <Text style={styles.subtitle}>
            שאלותייך מועברות לרבנים המתמחים ב
            {halachicProfile === 'sephardi' ? 'הלכה ספרדית' : 'הלכה אשכנזית'}
          </Text>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>כל השיחות מוצפנות. שאלותייך פרטיות לחלוטין.</Text>
        </View>

        <Text style={styles.sectionLabel}>רבנים זמינים</Text>

        {filteredRabbis.map((rabbi) => (
          <TouchableOpacity
            key={rabbi.id}
            style={[styles.card, !rabbi.isAvailable && styles.cardUnavailable]}
            onPress={() => rabbi.isAvailable && setSelectedRabbi(rabbi)}
            activeOpacity={rabbi.isAvailable ? 0.8 : 1}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {rabbi.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.rabbiName}>{rabbi.name}</Text>
              <Text style={styles.rabbiSpec}>
                {rabbi.specialty === 'sephardi' ? 'פוסק ספרדי' : 'פוסק אשכנזי'}
              </Text>
            </View>
            <View style={[styles.badge, rabbi.isAvailable ? styles.badgeAvail : styles.badgeBusy]}>
              <Text style={styles.badgeText}>{rabbi.isAvailable ? 'זמין' : 'עסוק'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {filteredRabbis.length === 0 && (
          <Text style={styles.empty}>אין רבנים זמינים כרגע. נסי שוב מאוחר יותר.</Text>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            השאלות מועברות לרב ביחס לעניינים הלכתיים. למקרי חירום יש לפנות לרופא.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.neutral.text },
  subtitle: { fontSize: typography.size.sm, color: colors.neutral.textLight, marginTop: 4, lineHeight: 20 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoIcon: { fontSize: 18 },
  infoText: { flex: 1, fontSize: typography.size.sm, color: colors.status.info, lineHeight: 18 },
  sectionLabel: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardUnavailable: { opacity: 0.55 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.white },
  cardInfo: { flex: 1 },
  rabbiName: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.text },
  rabbiSpec: { fontSize: typography.size.sm, color: colors.neutral.textMuted, marginTop: 2 },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeAvail: { backgroundColor: '#E8F8F0' },
  badgeBusy: { backgroundColor: colors.neutral.beige },
  badgeText: { fontSize: typography.size.xs, fontWeight: '600', color: colors.neutral.textLight },
  empty: { textAlign: 'center', color: colors.neutral.textMuted, padding: spacing.xl },
  disclaimer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.md,
  },
  disclaimerText: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
