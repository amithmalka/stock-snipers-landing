import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import {
  PREGNANCY_WEEKS,
  getWeekContent,
  calculatePregnancyWeek,
  calculateDueDate,
} from '../../data/pregnancyWeeks';
import { endPregnancy } from '../../services/supabase/pregnancyService';
import BabySizeVisual from '../../components/pregnancy/BabySizeVisual';

interface Props {
  userId: string;
  lmp: string; // YYYY-MM-DD
  onBabyBorn: () => void;
}

export default function PregnancyScreen({ userId, lmp, onBabyBorn }: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { week, days, totalDays } = useMemo(
    () => calculatePregnancyWeek(lmp, today),
    [lmp, today]
  );
  const dueDate = useMemo(() => calculateDueDate(lmp), [lmp]);
  const content = useMemo(() => getWeekContent(week), [week]);
  const [selectedWeek, setSelectedWeek] = useState<number>(week);
  const selected = useMemo(() => getWeekContent(selectedWeek), [selectedWeek]);
  const [exitModal, setExitModal] = useState<null | 'born' | 'cancel'>(null);
  const [ending, setEnding] = useState(false);
  const [exitError, setExitError] = useState<string | null>(null);

  const totalWeeks = 40;
  const progressPct = Math.min(100, Math.max(0, (totalDays / 280) * 100));
  const daysRemaining = Math.max(0, 280 - totalDays);

  function dueDateLabel(): string {
    const d = new Date(dueDate);
    return d.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  async function doEnd() {
    if (ending) return;
    setEnding(true);
    setExitError(null);
    try {
      await endPregnancy(userId);
      setExitModal(null);
      onBabyBorn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שגיאה';
      // Show error inline in the modal — window.alert / RN Alert can be
      // swallowed on PWAs, leaving the user with no feedback.
      setExitError(msg);
    } finally {
      setEnding(false);
    }
  }

  function closeExitModal() {
    if (ending) return;
    setExitModal(null);
    setExitError(null);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Header card with progress */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>שבוע</Text>
          <Text style={styles.headerWeek}>{week}</Text>
          <Text style={styles.headerSub}>+ {days} ימים · טרימסטר {content.trimester}</Text>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>מועד הלידה הצפוי</Text>
              <Text style={styles.metaValue}>{dueDateLabel()}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>נותרו</Text>
              <Text style={styles.metaValue}>{daysRemaining} ימים</Text>
            </View>
          </View>
        </View>

        {/* Quick week selector */}
        <View style={styles.selectorWrap}>
          <Text style={styles.sectionTitle}>בחירת שבוע</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {PREGNANCY_WEEKS.map((w) => {
              const isCurrent = w.week === week;
              const isSel = w.week === selectedWeek;
              return (
                <TouchableOpacity
                  key={w.week}
                  style={[
                    styles.weekChip,
                    isSel && styles.weekChipSel,
                    isCurrent && !isSel && styles.weekChipCurrent,
                  ]}
                  onPress={() => setSelectedWeek(w.week)}
                >
                  <Text style={[styles.weekChipText, isSel && styles.weekChipTextSel]}>
                    {w.week}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Size visualization */}
        <View style={styles.card}>
          <BabySizeVisual
            week={selected.week}
            sizeCm={selected.sizeCm}
            weightGr={selected.weightGr}
            fruit={selected.fruit}
            trimester={selected.trimester}
          />
        </View>

        {/* Baby development */}
        <View style={styles.card}>
          <SectionHeader iconName="user" label="התפתחות התינוק" />
          <Text style={styles.bodyText}>{selected.baby}</Text>
        </View>

        {/* Mom experience */}
        <View style={styles.card}>
          <SectionHeader iconName="heart" label="מה את מרגישה" />
          <Text style={styles.bodyText}>{selected.mom}</Text>
        </View>

        {/* Recommended tests */}
        {selected.tests && selected.tests.length > 0 && (
          <View style={[styles.card, styles.testsCard]}>
            <SectionHeader iconName="activity" label="בדיקות מומלצות לשבוע זה" />
            {selected.tests.map((t, i) => (
              <View key={i} style={styles.testRow}>
                <View style={styles.testBullet} />
                <Text style={styles.testText}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Tip */}
        {selected.tip && (
          <View style={[styles.card, styles.tipCard]}>
            <View style={styles.tipHeader}>
              <View style={styles.tipAccent} />
              <Text style={styles.tipLabel}>טיפ לשבוע זה</Text>
            </View>
            <Text style={styles.tipText}>{selected.tip}</Text>
          </View>
        )}

        {/* Upcoming tests overview */}
        <View style={styles.card}>
          <SectionHeader iconName="calendar" label="בדיקות בהמשך" />
          {PREGNANCY_WEEKS
            .filter((w) => w.week > week && w.tests && w.tests.length > 0)
            .slice(0, 5)
            .map((w) => (
              <TouchableOpacity
                key={w.week}
                style={styles.upcomingRow}
                onPress={() => setSelectedWeek(w.week)}
              >
                <View style={styles.upcomingWeek}>
                  <Text style={styles.upcomingWeekNum}>{w.week}</Text>
                </View>
                <View style={styles.upcomingDetails}>
                  <Text style={styles.upcomingTitle}>שבוע {w.week}</Text>
                  <Text style={styles.upcomingDesc} numberOfLines={2}>
                    {w.tests!.join(' · ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          {PREGNANCY_WEEKS.filter((w) => w.week > week && w.tests).length === 0 && (
            <Text style={styles.bodyText}>אין בדיקות נוספות מתוכננות. בקשי הנחיות מהרופאה.</Text>
          )}
        </View>

        {/* End pregnancy buttons — two clear options */}
        <TouchableOpacity
          style={styles.endBtn}
          activeOpacity={0.7}
          onPress={() => setExitModal('born')}
        >
          <Text style={styles.endBtnText}>ילדתי — חזרה ללוח הטהרה</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          activeOpacity={0.7}
          onPress={() => setExitModal('cancel')}
        >
          <Text style={styles.cancelBtnText}>יציאה ממצב הריון</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          המידע באפליקציה מיועד להעשרה כללית בלבד ואינו תחליף לייעוץ רפואי מקצועי.
        </Text>
      </ScrollView>

      {/* Custom confirm modal — conditionally rendered so it fully unmounts
          when closed (avoids RN Web Modal leaving a transparent backdrop that
          swallows tab-bar touches). */}
      {exitModal !== null && (
      <Modal
        transparent
        visible={true}
        animationType="fade"
        onRequestClose={closeExitModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {exitModal === 'born' ? 'מזל טוב!' : 'יציאה ממצב הריון'}
            </Text>
            <Text style={styles.modalBody}>
              {exitModal === 'born'
                ? 'האם ללדת ולחזור ללוח הטהרה הרגיל?'
                : 'לצאת ממצב הריון ולחזור ללוח הטהרה? המידע לא יימחק — תמיד ניתן להתחיל שוב.'}
            </Text>
            {exitError && (
              <View style={styles.modalError}>
                <Text style={styles.modalErrorText}>{exitError}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnGhost]}
                activeOpacity={0.7}
                disabled={ending}
                onPress={closeExitModal}
              >
                <Text style={styles.modalBtnGhostText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, ending && styles.modalBtnDisabled]}
                activeOpacity={0.7}
                disabled={ending}
                onPress={doEnd}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {ending ? 'שומר…' : exitError ? 'נסי שוב' : (exitModal === 'born' ? 'כן, ילדתי' : 'כן, לצאת')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}
    </SafeAreaView>
  );
}

function SectionHeader({ iconName, label }: { iconName: keyof typeof Feather.glyphMap; label: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconWrap}>
        <Feather name={iconName} size={14} color={colors.primary.rose} />
      </View>
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral.beige },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl + 40 },

  header: {
    backgroundColor: colors.primary.rose,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLabel: {
    color: colors.neutral.white,
    opacity: 0.85,
    fontSize: typography.size.sm,
    marginBottom: 2,
  },
  headerWeek: {
    color: colors.neutral.white,
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 78,
  },
  headerSub: {
    color: colors.neutral.white,
    opacity: 0.9,
    fontSize: typography.size.sm,
    marginBottom: spacing.md,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaCol: { alignItems: 'center', flex: 1 },
  metaLabel: {
    color: colors.neutral.white,
    opacity: 0.75,
    fontSize: typography.size.xs,
  },
  metaValue: {
    color: colors.neutral.white,
    fontSize: typography.size.sm,
    fontWeight: '700',
    marginTop: 2,
  },

  selectorWrap: { marginBottom: spacing.md },
  selectorRow: {
    paddingHorizontal: 2,
    gap: spacing.xs,
  },
  weekChip: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 22,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.neutral.beigeDeep,
  },
  weekChipSel: {
    backgroundColor: colors.primary.rose,
    borderColor: colors.primary.rose,
  },
  weekChipCurrent: {
    borderColor: colors.primary.rose,
    borderWidth: 2,
  },
  weekChipText: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  weekChipTextSel: {
    color: colors.neutral.white,
  },

  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardLabel: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  fruitEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  fruitName: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
  },
  fruitSize: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary.rosePale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.text,
    letterSpacing: 0.2,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tipAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#C39B43',
  },
  bodyText: {
    fontSize: typography.size.sm,
    color: colors.neutral.text,
    lineHeight: 22,
  },

  testsCard: {
    backgroundColor: colors.primary.rosePale,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  testBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary.rose,
    marginTop: 8,
    marginLeft: spacing.sm,
  },
  testText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.neutral.text,
    lineHeight: 22,
  },

  tipCard: {
    backgroundColor: '#FFF8E7',
    borderLeftWidth: 4,
    borderLeftColor: '#F0C674',
  },
  tipLabel: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: '#8A6A1B',
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: typography.size.sm,
    color: colors.neutral.text,
    lineHeight: 22,
  },

  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.beige,
  },
  upcomingWeek: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.rosePale,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  upcomingWeekNum: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.primary.rose,
  },
  upcomingDetails: { flex: 1 },
  upcomingTitle: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.neutral.text,
  },
  upcomingDesc: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },

  endBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary.rose,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  endBtnText: {
    color: colors.neutral.white,
    fontSize: typography.size.md,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.neutral.textMuted,
    fontSize: typography.size.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: '800',
    color: colors.neutral.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalError: {
    backgroundColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  modalErrorText: {
    fontSize: typography.size.xs,
    color: '#991B1B',
    lineHeight: 18,
    textAlign: 'right',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: colors.primary.rose,
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
  modalBtnPrimaryText: {
    color: colors.neutral.white,
    fontSize: typography.size.md,
    fontWeight: '700',
  },
  modalBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.neutral.beigeDeep,
  },
  modalBtnGhostText: {
    color: colors.neutral.text,
    fontSize: typography.size.md,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: spacing.md,
    textAlign: 'center',
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
});
