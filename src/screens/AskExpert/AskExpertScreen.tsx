import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';

export default function AskExpertScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.emoji}>✨</Text>
        <Text style={styles.title}>בקרוב!</Text>
        <Text style={styles.subtitle}>שאלי רב</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            האפליקציה שלנו חדשה ואנחנו עובדות קשה כדי להביא לכן את הטוב ביותר.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.body}>
            אנחנו בתהליך גיוס רבנים מוסמכים שייתנו לכן מענה אישי לכל שאלה — בכל שעה, בצניעות ובכבוד.
          </Text>
        </View>
        <Text style={styles.note}>האפשרות לשאול שאלה תיפתח בקרוב 🙏</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: typography.size.lg, color: colors.primary.gold, fontWeight: '600', textAlign: 'center', marginBottom: spacing.xl },
  card: {
    width: '100%', backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl,
    padding: spacing.lg, marginBottom: spacing.lg,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  divider: { height: 1, backgroundColor: colors.neutral.beigeDeep, marginVertical: spacing.md },
  body: { fontSize: typography.size.sm, color: colors.neutral.textLight, textAlign: 'center', lineHeight: 22 },
  note: { fontSize: typography.size.sm, color: colors.primary.gold, fontWeight: '600', textAlign: 'center' },
});
