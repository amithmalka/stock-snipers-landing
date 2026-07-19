import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { VesetDate } from '../../types/halachic';
import { toHebrewDate } from '../../utils/hebrewDate';

type AppStatus =
  | { kind: 'cycle_active'; dayNum: number }
  | { kind: 'counting_clean'; dayNum: number; mikvehDate: string }
  | { kind: 'veset_approaching'; nextVeset: VesetDate; daysAway: number }
  | { kind: 'clear' };

interface StatusBannerProps {
  status: AppStatus;
}

function daysUntil(isoDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(isoDate);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function formatHebrewDate(isoDate: string): string {
  const hd = toHebrewDate(new Date(isoDate));
  return hd.display;
}

const VESET_NAMES: Record<VesetDate['type'], string> = {
  onah_beinonit: 'עונה בינונית',
  veset_hachodesh: 'וסת החודש',
  veset_haflagah: 'וסת ההפלגה',
  or_zarua: 'אור זרוע',
};

export const StatusBanner: React.FC<StatusBannerProps> = ({ status }) => {
  if (status.kind === 'clear') {
    return (
      <View style={[styles.banner, styles.bannerClear]}>
        <View style={styles.iconCircle}>
          <Feather name="check" size={18} color={colors.primary.rose} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.primary}>מצב: טהורה</Text>
          <Text style={styles.secondary}>אין וסתות צפויים בקרוב</Text>
        </View>
      </View>
    );
  }

  if (status.kind === 'cycle_active') {
    const canHefsek = status.dayNum >= 5;
    return (
      <View style={[styles.banner, styles.bannerCycle]}>
        <View style={styles.iconCircle}>
          <Feather name="droplet" size={18} color={colors.primary.rose} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.primary}>יום {status.dayNum} לווסת</Text>
          <Text style={styles.secondary}>
            {canHefsek
              ? 'ניתן לבצע הפסק טהרה היום לפני השקיעה'
              : `הפסק טהרה מותר מיום 5 בלבד · עוד ${5 - status.dayNum} ימים`}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countNum}>{status.dayNum}</Text>
          <Text style={styles.countLabel}>יום</Text>
        </View>
      </View>
    );
  }

  if (status.kind === 'counting_clean') {
    const daysToMikveh = daysUntil(status.mikvehDate);
    const hebrewMikveh = formatHebrewDate(status.mikvehDate);
    return (
      <View style={[styles.banner, styles.bannerCounting]}>
        <View style={styles.iconCircle}>
          <Feather name="check-circle" size={18} color={colors.primary.rose} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.primary}>יום {status.dayNum} לספירה</Text>
          <Text style={styles.secondary}>
            ליל טבילה בעוד {daysToMikveh} ימים · {hebrewMikveh}
          </Text>
        </View>
        <View style={[styles.countBadge, styles.countBadgeTeal]}>
          <Text style={styles.countNum}>{status.dayNum}</Text>
          <Text style={styles.countLabel}>נקיים</Text>
        </View>
      </View>
    );
  }

  if (status.kind === 'veset_approaching') {
    const { nextVeset, daysAway } = status;
    return (
      <View style={[styles.banner, styles.bannerVeset]}>
        <View style={styles.iconCircle}>
          <Feather name="bell" size={18} color={colors.primary.rose} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.primary}>{VESET_NAMES[nextVeset.type]} מתקרב</Text>
          <Text style={styles.secondary}>
            {daysAway === 0
              ? `הלילה / היום (${nextVeset.onah === 'night' ? 'לילה' : 'יום'})`
              : `בעוד ${daysAway} ימים · ${nextVeset.onah === 'night' ? 'לילה' : 'יום'}`}
          </Text>
        </View>
        <View style={[styles.countBadge, styles.countBadgeAlert]}>
          <Text style={styles.countNum}>{daysAway}</Text>
          <Text style={styles.countLabel}>ימים</Text>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  bannerClear: {
    backgroundColor: '#EDF4F1',
    borderLeftWidth: 4,
    borderLeftColor: colors.calendar.hefsek,
  },
  bannerCycle: {
    backgroundColor: '#FDF0F0',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.rose,
  },
  bannerCounting: {
    backgroundColor: '#EAF0EF',
    borderLeftWidth: 4,
    borderLeftColor: colors.calendar.mikveh,
  },
  bannerVeset: {
    backgroundColor: '#FDF4EC',
    borderLeftWidth: 4,
    borderLeftColor: colors.calendar.vesetFixed,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.rosePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  primary: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  secondary: {
    fontSize: typography.size.sm,
    color: colors.neutral.textLight,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: colors.primary.rose,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 44,
  },
  countBadgeTeal: {
    backgroundColor: colors.calendar.mikveh,
  },
  countBadgeAlert: {
    backgroundColor: colors.calendar.vesetFixed,
  },
  countNum: {
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.neutral.white,
  },
  countLabel: {
    fontSize: typography.size.xs,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
});
