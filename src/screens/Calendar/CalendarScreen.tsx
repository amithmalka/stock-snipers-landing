import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthlyCalendar } from '../../components/calendar/MonthlyCalendar';
import { CycleEntryModal } from '../../components/calendar/CycleEntryModal';
import { DayDetailSheet } from '../../components/calendar/DayDetailSheet';
import { StatusBanner } from '../../components/calendar/StatusBanner';
import { useBiometricLock } from '../../hooks/useBiometricLock';
import { colors, typography, spacing } from '../../config/theme';
import { calculateVesetDates } from '../../services/halachic/calculator';
import { VesetDate, CycleEntry, Onah, HalachicProfile } from '../../types/halachic';
import { toHebrewDate, formatDateISO } from '../../utils/hebrewDate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isoOf(date: Date): string {
  return formatDateISO(date);
}

function daysFrom(isoA: string, isoB: string): number {
  return Math.round(
    (new Date(isoB).getTime() - new Date(isoA).getTime()) / 86400000
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CalendarScreenProps {
  userId?: string;
  halachicProfile?: HalachicProfile;
  biometricEnabled?: boolean;
  userLatitude?: number;
  userLongitude?: number;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CalendarScreen({
  userId = 'demo',
  halachicProfile = 'sephardi',
  biometricEnabled = false,
  userLatitude = 31.7683,
  userLongitude = 35.2137,
}: CalendarScreenProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [cycles, setCycles] = useState<CycleEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedVesot, setSelectedVesot] = useState<VesetDate[]>([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const { isUnlocked, isAuthenticating, authenticate, error: authError } =
    useBiometricLock(biometricEnabled);

  // ---- Calculated veset dates for the most recent cycle ----
  const latestResult = useMemo(() => {
    if (cycles.length === 0) return null;
    const latest = cycles[cycles.length - 1];
    return calculateVesetDates({
      startDate: latest.startDate,
      hebrewDate: latest.hebrewDate,
      onah: latest.onah,
      latitude: userLatitude,
      longitude: userLongitude,
      profile: halachicProfile,
      previousCycles: cycles.slice(0, -1),
    });
  }, [cycles, halachicProfile, userLatitude, userLongitude]);

  const allVesetDates = latestResult?.vesetDates ?? [];

  // ---- Status banner logic ----
  const bannerStatus = useMemo(() => {
    if (!latestResult || cycles.length === 0) return { kind: 'clear' as const };
    const latest = cycles[cycles.length - 1];
    const todayIso = isoOf(today);
    const daysSinceStart = daysFrom(latest.startDate, todayIso);

    if (daysSinceStart >= 0 && daysSinceStart < 5) {
      return {
        kind: 'cycle_active' as const,
        dayNum: daysSinceStart + 1,
        hefsekDate: latestResult.hefsekTaharahDate,
      };
    }

    const daysSinceHefsek = daysFrom(latestResult.hefsekTaharahDate, todayIso);
    if (daysSinceHefsek >= 0 && daysSinceHefsek < 7) {
      return {
        kind: 'counting_clean' as const,
        dayNum: daysSinceHefsek + 1,
        mikvehDate: latestResult.mikvehNight,
      };
    }

    const upcoming = allVesetDates
      .map((v) => ({ v, days: daysFrom(todayIso, v.date) }))
      .filter(({ days }) => days >= 0 && days <= 3)
      .sort((a, b) => a.days - b.days);

    if (upcoming.length > 0) {
      return {
        kind: 'veset_approaching' as const,
        nextVeset: upcoming[0].v,
        daysAway: upcoming[0].days,
      };
    }

    return { kind: 'clear' as const };
  }, [latestResult, cycles, allVesetDates]);

  // ---- Handlers ----
  const handleDayPress = useCallback((date: Date, vesot: VesetDate[]) => {
    setSelectedDate(date);
    setSelectedVesot(vesot);
    setShowDetailSheet(true);
  }, []);

  const handleLogCycle = useCallback(() => {
    setShowDetailSheet(false);
    setShowEntryModal(true);
  }, []);

  const handleConfirmCycle = useCallback(
    (date: Date, onah: Onah) => {
      const hd = toHebrewDate(date);
      const entry: CycleEntry = {
        id: String(Date.now()),
        userId,
        startDate: isoOf(date),
        hebrewDate: hd.display,
        onah,
        createdAt: new Date().toISOString(),
      };
      setCycles((prev) => [...prev, entry]);
      setShowEntryModal(false);
    },
    [userId]
  );

  // ---- Biometric gate ----
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.lockScreen}>
        <View style={styles.lockContent}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockTitle}>SIEL</Text>
          <Text style={styles.lockSubtitle}>אמתי את זהותך כדי להיכנס</Text>
          {authError && <Text style={styles.lockError}>{authError}</Text>}
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={authenticate}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Text style={styles.unlockText}>פתחי עם Face ID / טביעת אצבע</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cycleDates = cycles.map((c) => c.startDate);
  const hefsekDate = latestResult?.hefsekTaharahDate;
  const mikvehDate = latestResult?.mikvehNight;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>SIEL</Text>
          <Text style={styles.headerSub}>לוח מחזור</Text>
        </View>

        {/* Status banner */}
        <StatusBanner status={bannerStatus} />

        {/* Monthly calendar */}
        <MonthlyCalendar
          year={year}
          month={month}
          vesetDates={allVesetDates}
          cycleDates={cycleDates}
          hefsekDate={hefsekDate}
          mikvehDate={mikvehDate}
          onDayPress={handleDayPress}
          onPrevMonth={() => {
            if (month === 0) { setMonth(11); setYear((y) => y - 1); }
            else setMonth((m) => m - 1);
          }}
          onNextMonth={() => {
            if (month === 11) { setMonth(0); setYear((y) => y + 1); }
            else setMonth((m) => m + 1);
          }}
        />

        {/* Quick log button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setSelectedDate(today); setShowEntryModal(true); }}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ רישום וסת היום</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      {selectedDate && (
        <>
          <CycleEntryModal
            visible={showEntryModal}
            selectedDate={selectedDate}
            onConfirm={handleConfirmCycle}
            onCancel={() => setShowEntryModal(false)}
          />
          <DayDetailSheet
            visible={showDetailSheet}
            date={selectedDate}
            vesot={selectedVesot}
            isHefsek={hefsekDate ? isoOf(selectedDate) === hefsekDate : false}
            isMikveh={mikvehDate ? isoOf(selectedDate) === mikvehDate : false}
            isCycleStart={cycleDates.includes(isoOf(selectedDate))}
            onClose={() => setShowDetailSheet(false)}
            onLogCycle={handleLogCycle}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.beige,
  },
  scroll: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  appName: {
    fontSize: typography.size.title,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 6,
  },
  headerSub: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    marginTop: 2,
  },
  addBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.neutral.cream,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary.goldLight,
  },
  addBtnText: {
    color: colors.primary.gold,
    fontSize: typography.size.md,
    fontWeight: '700',
  },
  lockScreen: {
    flex: 1,
    backgroundColor: colors.neutral.beige,
  },
  lockContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  lockTitle: {
    fontSize: typography.size.title,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 6,
    marginBottom: spacing.xs,
  },
  lockSubtitle: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  lockError: {
    color: colors.status.alert,
    fontSize: typography.size.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  unlockBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: 50,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    minWidth: 260,
    alignItems: 'center',
  },
  unlockText: {
    color: colors.neutral.white,
    fontSize: typography.size.md,
    fontWeight: '700',
  },
});
