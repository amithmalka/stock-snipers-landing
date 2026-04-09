import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../config/theme';

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community</Text>
      <Text style={styles.subtitle}>Anonymous Forum</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.size.xxl,
    color: colors.neutral.text,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    marginTop: spacing.sm,
  },
});
