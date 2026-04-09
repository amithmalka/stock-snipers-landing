import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { Onah } from '../../types/halachic';
import { toHebrewDate } from '../../utils/hebrewDate';

interface CycleEntryModalProps {
  visible: boolean;
  selectedDate: Date;
  onConfirm: (date: Date, onah: Onah) => void;
  onCancel: () => void;
}

export const CycleEntryModal: React.FC<CycleEntryModalProps> = ({
  visible,
  selectedDate,
  onConfirm,
  onCancel,
}) => {
  const [onah, setOnah] = useState<Onah>('day');

  const hd = toHebrewDate(selectedDate);
  const gregorianStr = selectedDate.toLocaleDateString('he-IL', {
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
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <Text style={styles.title}>רישום וסת חדש</Text>
          <Text style={styles.dateGreg}>{gregorianStr}</Text>
          <Text style={styles.dateHebrew}>{hd.display}</Text>

          {/* Onah selector */}
          <Text style={styles.sectionLabel}>עונה</Text>
          <View style={styles.onahRow}>
            {(['day', 'night'] as Onah[]).map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.onahBtn, onah === o && styles.onahBtnActive]}
                onPress={() => setOnah(o)}
                activeOpacity={0.8}
              >
                <Text style={[styles.onahText, onah === o && styles.onahTextActive]}>
                  {o === 'day' ? '☀️  יום' : '🌙  לילה'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              לאחר האישור יחושבו תאריכי הווסת הצפויים אוטומטית
            </Text>
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => onConfirm(selectedDate, onah)}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>אישור</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>ביטול</Text>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.beigeDeep,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: spacing.xs,
  },
  dateGreg: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    marginBottom: 2,
  },
  dateHebrew: {
    fontSize: typography.size.md,
    color: colors.primary.gold,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  onahRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  onahBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.beigeDeep,
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
  },
  onahBtnActive: {
    borderColor: colors.primary.gold,
    backgroundColor: '#FFF8E7',
  },
  onahText: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    fontWeight: '500',
  },
  onahTextActive: {
    color: colors.primary.gold,
    fontWeight: '700',
  },
  notice: {
    backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    fontSize: typography.size.sm,
    color: colors.neutral.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  confirmText: {
    color: colors.neutral.white,
    fontSize: typography.size.lg,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.neutral.textMuted,
    fontSize: typography.size.md,
  },
});
