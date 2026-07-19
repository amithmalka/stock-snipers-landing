import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Modal } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { lmpFromWeek } from '../../data/pregnancyWeeks';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (lmpIso: string) => void;
}

type Mode = 'lmp' | 'week';

export default function PregnancyStartModal({ visible, onClose, onConfirm }: Props) {
  const [mode, setMode] = useState<Mode>('lmp');
  const [lmpDate, setLmpDate] = useState(() => {
    // Default LMP: ~4 weeks ago (early discovery)
    const d = new Date();
    d.setDate(d.getDate() - 28);
    return d.toISOString().slice(0, 10);
  });
  const [weekInput, setWeekInput] = useState('8');

  function handleConfirm() {
    if (mode === 'lmp') {
      onConfirm(lmpDate);
    } else {
      const week = Math.max(4, Math.min(42, Number(weekInput) || 8));
      onConfirm(lmpFromWeek(week));
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>לוח הריון</Text>
          <Text style={styles.subtitle}>
            מזל טוב. בחרי איך תרצי להזין את שלב ההריון
          </Text>

          {/* Mode toggle */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'lmp' && styles.modeBtnActive]}
              onPress={() => setMode('lmp')}
            >
              <Text style={[styles.modeText, mode === 'lmp' && styles.modeTextActive]}>תאריך וסת אחרונה</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'week' && styles.modeBtnActive]}
              onPress={() => setMode('week')}
            >
              <Text style={[styles.modeText, mode === 'week' && styles.modeTextActive]}>שבוע הריון נוכחי</Text>
            </TouchableOpacity>
          </View>

          {mode === 'lmp' ? (
            <View>
              <Text style={styles.label}>היום הראשון של הוסת האחרונה לפני ההריון:</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={lmpDate}
                  onChange={(e) => setLmpDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#E5DCD3',
                    fontSize: 16,
                    backgroundColor: '#FAF8F3',
                    direction: 'ltr',
                    textAlign: 'center',
                  } as React.CSSProperties}
                />
              ) : (
                <TextInput
                  value={lmpDate}
                  onChangeText={setLmpDate}
                  placeholder="YYYY-MM-DD"
                  style={styles.dateInput}
                />
              )}
              <Text style={styles.help}>
                מועד הלידה יחושב לפי כלל Naegele (וסת + 280 ימים)
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>באיזה שבוע הריון את היום?</Text>
              <View style={styles.weekRow}>
                <TouchableOpacity
                  style={styles.weekBtn}
                  onPress={() => setWeekInput(String(Math.max(4, (Number(weekInput) || 8) - 1)))}
                >
                  <Text style={styles.weekBtnText}>−</Text>
                </TouchableOpacity>
                <View style={styles.weekDisplay}>
                  <Text style={styles.weekNum}>{weekInput}</Text>
                  <Text style={styles.weekLabel}>שבועות</Text>
                </View>
                <TouchableOpacity
                  style={styles.weekBtn}
                  onPress={() => setWeekInput(String(Math.min(42, (Number(weekInput) || 8) + 1)))}
                >
                  <Text style={styles.weekBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.help}>
                ניתן להזין שבועות בין 4 ל-42
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.confirm} onPress={handleConfirm}>
            <Text style={styles.confirmText}>אישור והתחלת לוח הריון</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl + spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.neutral.beige,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral.beige,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: colors.primary.rose,
    borderColor: colors.primary.rose,
  },
  modeText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral.text,
  },
  modeTextActive: {
    color: colors.neutral.white,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral.text,
    marginBottom: spacing.sm,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.neutral.beige,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.size.md,
    color: colors.neutral.text,
    backgroundColor: colors.neutral.beige,
    textAlign: 'center',
  },
  help: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginVertical: spacing.md,
  },
  weekBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.rose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral.white,
  },
  weekDisplay: {
    minWidth: 100,
    alignItems: 'center',
  },
  weekNum: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary.rose,
    lineHeight: 56,
  },
  weekLabel: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
  },
  confirm: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary.rose,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  confirmText: {
    color: colors.neutral.white,
    fontSize: typography.size.md,
    fontWeight: '700',
  },
  cancel: {
    marginTop: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelText: {
    color: colors.neutral.textMuted,
    fontSize: typography.size.sm,
  },
});
