import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { VesetDate } from '../../types/halachic';
import { toHebrewDate } from '../../utils/hebrewDate';

const VESET_LABELS: Record<VesetDate['type'], string> = {
  onah_beinonit: 'עונה בינונית (יום 30)',
  veset_hachodesh: 'וסת החודש',
  veset_haflagah: 'וסת ההפלגה',
  or_zarua: 'אור זרוע',
};

const VESET_COLORS: Record<VesetDate['type'], string> = {
  onah_beinonit: colors.calendar.vesetFixed,
  veset_hachodesh: colors.status.info,
  veset_haflagah: colors.primary.rose,
  or_zarua: '#B47AB4',
};

const ONAH_LABELS: Record<string, string> = {
  day: 'יום',
  night: 'לילה',
};

interface DayDetailSheetProps {
  visible: boolean;
  date: Date | null;
  vesot: VesetDate[];
  isHefsek: boolean;
  isMikveh: boolean;
  isCycleStart: boolean;
  onClose: () => void;
  onLogCycle?: () => void;
}

export const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
  visible,
  date,
  vesot,
  isHefsek,
  isMikveh,
  isCycleStart,
  onClose,
  onLogCycle,
}) => {
  if (!date) return null;

  const hd = toHebrewDate(date);
  const gregorianStr = date.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Date header */}
          <Text style={styles.gregorian}>{gregorianStr}</Text>
          <Text style={styles.hebrew}>{hd.display}</Text>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Cycle start badge */}
            {isCycleStart && (
              <View style={[styles.badge, { backgroundColor: colors.primary.roseLight }]}>
                <Text style={styles.badgeText}>📍 תחילת וסת</Text>
              </View>
            )}

            {/* Hefsek Taharah */}
            {isHefsek && (
              <View style={[styles.card, { borderLeftColor: colors.calendar.hefsek }]}>
                <Text style={styles.cardTitle}>הפסק טהרה</Text>
                <Text style={styles.cardDesc}>
                  ניתן לבצע בדיקת הפסק טהרה בשקיעה. יש לפנות לרב לפרטים נוספים.
                </Text>
              </View>
            )}

            {/* Mikveh */}
            {isMikveh && (
              <View style={[styles.card, { borderLeftColor: colors.calendar.mikveh }]}>
                <Text style={styles.cardTitle}>ליל טבילה</Text>
                <Text style={styles.cardDesc}>
                  הלילה הוא ליל הטבילה לאחר שבעה נקיים. ברוכה הבאה!
                </Text>
              </View>
            )}

            {/* Vesot */}
            {vesot.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>וסתות צפויות</Text>
                {vesot.map((v, i) => (
                  <View key={i} style={[styles.card, { borderLeftColor: VESET_COLORS[v.type] }]}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{VESET_LABELS[v.type]}</Text>
                      <View style={[styles.onahPill, { backgroundColor: colors.neutral.beige }]}>
                        <Text style={styles.onahPillText}>{ONAH_LABELS[v.onah]}</Text>
                      </View>
                    </View>
                    {v.isFixed && (
                      <View style={styles.fixedBadge}>
                        <Text style={styles.fixedBadgeText}>קבוע</Text>
                      </View>
                    )}
                    <Text style={styles.cardDesc}>
                      {v.type === 'or_zarua'
                        ? 'יש להתחיל לשמור מונה עונה לפני הזמן הצפוי (מנהג אשכנזים)'
                        : 'יש לשמור את העונה בהתאם להוראות הרב'}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* No events */}
            {vesot.length === 0 && !isHefsek && !isMikveh && !isCycleStart && (
              <Text style={styles.emptyText}>אין אירועים מיוחדים ביום זה</Text>
            )}

            {/* Log cycle button */}
            {onLogCycle && (
              <TouchableOpacity style={styles.logBtn} onPress={onLogCycle} activeOpacity={0.85}>
                <Text style={styles.logBtnText}>רישום תחילת וסת ביום זה</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    paddingTop: spacing.md,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.beigeDeep,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  gregorian: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    textAlign: 'center',
  },
  hebrew: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.primary.gold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    flexGrow: 0,
  },
  badge: {
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  sectionTitle: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    fontWeight: '600',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  cardDesc: {
    fontSize: typography.size.sm,
    color: colors.neutral.textLight,
    lineHeight: 20,
    marginTop: 4,
  },
  onahPill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  onahPillText: {
    fontSize: typography.size.xs,
    color: colors.neutral.textLight,
    fontWeight: '600',
  },
  fixedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.calendar.vesetFixed,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: 4,
  },
  fixedBadgeText: {
    fontSize: typography.size.xs,
    color: colors.neutral.white,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    fontSize: typography.size.sm,
    marginVertical: spacing.lg,
  },
  logBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary.gold,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  logBtnText: {
    color: colors.primary.gold,
    fontSize: typography.size.md,
    fontWeight: '600',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  closeBtnText: {
    color: colors.neutral.textMuted,
    fontSize: typography.size.md,
  },
});
