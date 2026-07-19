import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MonthlyCalendar } from '../../components/calendar/MonthlyCalendar';
import { CycleEntryModal } from '../../components/calendar/CycleEntryModal';
import { DayDetailSheet } from '../../components/calendar/DayDetailSheet';
import { StatusBanner } from '../../components/calendar/StatusBanner';
import { useBiometricLock } from '../../hooks/useBiometricLock';
import { colors, typography, spacing } from '../../config/theme';
import { calculateVesetDates } from '../../services/halachic/calculator';
import { fetchCycles, saveCycle, saveHefsek, deleteCycle, clearHefsek } from '../../services/supabase/cyclesService';
import { fetchPregnancyState, startPregnancy, readPregnancyCache } from '../../services/supabase/pregnancyService';
import PregnancyStartModal from '../../components/pregnancy/PregnancyStartModal';
import PregnancyScreen from '../Pregnancy/PregnancyScreen';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { scheduleNotificationsForCycle, scheduleCleanDayReminders, registerForPushNotifications } from '../../services/notifications/notificationsService';
import { isSupabaseConfigured } from '../../config/supabase';
import { VesetDate, CycleEntry, Onah, HalachicProfile } from '../../types/halachic';
import { toHebrewDate, formatDateISO } from '../../utils/hebrewDate';
import { uuidv4 } from '../../utils/uuid';
import { useLanguage } from '../../contexts/LanguageContext';

function isoOf(date: Date): string {
  return formatDateISO(date);
}

function daysFrom(isoA: string, isoB: string): number {
  return Math.round(
    (new Date(isoB).getTime() - new Date(isoA).getTime()) / 86400000
  );
}

interface CalendarScreenProps {
  userId?: string;
  halachicProfile?: HalachicProfile;
  biometricEnabled?: boolean;
  userLatitude?: number;
  userLongitude?: number;
}

export default function CalendarScreen({
  userId = 'demo',
  halachicProfile = 'sephardi',
  biometricEnabled = false,
  userLatitude = 31.7683,
  userLongitude = 35.2137,
}: CalendarScreenProps) {
  const { t } = useLanguage();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Pregnancy mode state — initialize synchronously from localStorage so
  // the pregnancy view shows immediately on cold start, with no flicker
  // back to the tahara calendar while the DB read is in flight.
  const initialCache = userId && userId !== 'demo' ? readPregnancyCache(userId) : null;
  const [pregnancyLoading, setPregnancyLoading] = useState(!initialCache);
  const [pregnancyLmp, setPregnancyLmp] = useState<string | null>(initialCache?.lmp ?? null);
  const [isPregnant, setIsPregnant] = useState<boolean>(initialCache?.isPregnant ?? false);
  const [showPregnancyStart, setShowPregnancyStart] = useState(false);

  useEffect(() => {
    if (!userId || userId === 'demo') {
      setPregnancyLoading(false);
      return;
    }
    fetchPregnancyState(userId)
      .then((s) => {
        setIsPregnant(s.isPregnant);
        setPregnancyLmp(s.lmp);
      })
      .catch(() => {})
      .finally(() => setPregnancyLoading(false));
  }, [userId]);

  async function handleStartPregnancy(lmpIso: string) {
    if (!userId || userId === 'demo') {
      setShowPregnancyStart(false);
      return;
    }
    try {
      await startPregnancy(userId, lmpIso);
      setIsPregnant(true);
      setPregnancyLmp(lmpIso);
      setShowPregnancyStart(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'שגיאה';
      // Alert.alert is silent in browsers — fall back to window.alert on web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(msg);
      } else {
        Alert.alert('שגיאה', msg);
      }
    }
  }

  function handleBabyBorn() {
    setIsPregnant(false);
    setPregnancyLmp(null);
  }

  // Use a single stable cache key (cleared on signOut by useAuth)
  const CYCLES_CACHE_KEY = 'siel.cycles.cache';
  const loadCachedCycles = (): CycleEntry[] => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = window.localStorage.getItem(CYCLES_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };
  const saveCachedCycles = (cs: CycleEntry[]) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(CYCLES_CACHE_KEY, JSON.stringify(cs));
    } catch {}
  };

  const [cycles, setCyclesRaw] = useState<CycleEntry[]>(() => loadCachedCycles());
  // Wrap setCycles so every state update also persists to localStorage —
  // ensures the cache survives cold starts even if no fetch has succeeded yet.
  const setCycles = useCallback((updater: React.SetStateAction<CycleEntry[]>) => {
    setCyclesRaw((prev) => {
      const next = typeof updater === 'function' ? (updater as (p: CycleEntry[]) => CycleEntry[])(prev) : updater;
      saveCachedCycles(next);
      return next;
    });
  }, []);
  const [isLoadingCycles, setIsLoadingCycles] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedVesot, setSelectedVesot] = useState<VesetDate[]>([]);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { isUnlocked, isAuthenticating, authenticate, error: authError } =
    useBiometricLock(biometricEnabled);

  const loadCycles = useCallback(() => {
    if (!isSupabaseConfigured || userId === 'demo') return;
    // Only show loading spinner if we have NO cached data — otherwise let
    // the UI show cached cycles immediately while we refresh in background.
    const hasCache = loadCachedCycles().length > 0;
    if (!hasCache) setIsLoadingCycles(true);
    let done = false;
    const safety = setTimeout(() => {
      if (!done) setIsLoadingCycles(false);
    }, 5000);
    fetchCycles(userId)
      .then((dbCycles) => {
        done = true;
        if (!dbCycles) return;
        // Merge: prefer DB version (server is authoritative for confirmed data),
        // but keep any LOCAL entries that haven't synced to DB yet (pending saves).
        setCycles((local) => {
          const byId = new Map<string, CycleEntry>();
          for (const c of local) byId.set(c.id, c); // local first
          for (const c of dbCycles) byId.set(c.id, c); // DB overrides for confirmed entries
          const merged = Array.from(byId.values()).sort((a, b) => a.startDate.localeCompare(b.startDate));
          saveCachedCycles(merged);
          return merged;
        });
      })
      .catch((e) => { done = true; console.error('[Calendar] fetchCycles failed:', e); })
      .finally(() => {
        clearTimeout(safety);
        setIsLoadingCycles(false);
      });
  }, [userId]);

  useEffect(() => { loadCycles(); }, [loadCycles]);
  useFocusEffect(useCallback(() => { loadCycles(); }, [loadCycles]));

  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);

  const latestResult = useMemo(() => {
    if (cycles.length === 0) return null;
    const latest = cycles[cycles.length - 1];
    return calculateVesetDates({
      startDate: latest.startDate,
      hebrewDate: latest.hebrewDate,
      onah: latest.onah,
      hefsekDate: latest.hefsekDate,
      latitude: userLatitude,
      longitude: userLongitude,
      profile: halachicProfile,
      previousCycles: cycles.slice(0, -1),
    });
  }, [cycles, halachicProfile, userLatitude, userLongitude]);

  const allVesetDates = latestResult?.vesetDates ?? [];

  const bannerStatus = useMemo(() => {
    if (cycles.length === 0) return { kind: 'clear' as const };
    const latest = cycles[cycles.length - 1];
    const todayIso = isoOf(today);
    const daysSinceStart = daysFrom(latest.startDate, todayIso);

    if (daysSinceStart >= 0 && !latest.hefsekDate) {
      return { kind: 'cycle_active' as const, dayNum: daysSinceStart + 1 };
    }

    if (latestResult?.hefsekTaharahDate) {
      const daysSinceHefsek = daysFrom(latestResult.hefsekTaharahDate, todayIso);
      if (daysSinceHefsek >= 0 && daysSinceHefsek < 7) {
        return {
          kind: 'counting_clean' as const,
          dayNum: daysSinceHefsek + 1,
          mikvehDate: latestResult.mikvehNight!,
        };
      }
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

  const handleDayPress = useCallback((date: Date, vesot: VesetDate[]) => {
    setSelectedDate(date);
    setSelectedVesot(vesot);
    setShowDetailSheet(true);
  }, []);

  const handleLogCycle = useCallback(() => {
    setShowDetailSheet(false);
    setShowEntryModal(true);
  }, []);

  const latestCycle = cycles.length > 0 ? cycles[cycles.length - 1] : null;
  const latestCycleHasHefsek = !!latestCycle?.hefsekDate;
  const daysSinceLatestStart = latestCycle ? daysFrom(latestCycle.startDate, isoOf(today)) : -1;
  const canRecordHefsek = !!latestCycle && !latestCycleHasHefsek && daysSinceLatestStart >= 4;

  const handleHefsekToday = useCallback(() => {
    const todayIso = isoOf(today);
    setSaveError(null);
    setCycles((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], hefsekDate: todayIso };
      if (isSupabaseConfigured && userId !== 'demo') {
        saveHefsek(updated[updated.length - 1].id, todayIso).catch((e: any) => {
          console.error('[Calendar] saveHefsek failed:', e);
          const msg = e?.message || e?.details || e?.hint || (typeof e === 'string' ? e : JSON.stringify(e));
          setSaveError('שמירת הפסק טהרה נכשלה: ' + msg);
        });
      }
      return updated;
    });
    scheduleCleanDayReminders(todayIso, halachicProfile).catch(() => {});
  }, [today, halachicProfile, userId]);

  const handleHefsekForDate = useCallback(() => {
    if (!selectedDate) return;
    const dateIso = isoOf(selectedDate);
    setCycles((prev) => {
      if (prev.length === 0) {
        // No cycle recorded yet — create a minimal entry with just the hefsek date
        const hd = toHebrewDate(selectedDate);
        const entry: CycleEntry = {
          id: uuidv4(),
          userId,
          startDate: dateIso,
          hebrewDate: hd.display,
          onah: 'day',
          hefsekDate: dateIso,
          createdAt: new Date().toISOString(),
        };
        return [entry];
      }
      const updated = [...prev];
      updated[updated.length - 1] = { ...updated[updated.length - 1], hefsekDate: dateIso };
      return updated;
    });
    scheduleCleanDayReminders(dateIso, halachicProfile).catch(() => {});
    // Persist hefsek to Supabase
    if (isSupabaseConfigured && userId !== 'demo') {
      setCycles((current) => {
        const latest = current[current.length - 1];
        if (latest) saveHefsek(latest.id, dateIso).catch(() => {});
        return current;
      });
    }
    setShowDetailSheet(false);
  }, [selectedDate, halachicProfile, userId]);

  const handleDayLongPress = useCallback((date: Date) => {
    const iso = isoOf(date);
    // Find a cycle this day belongs to
    const cycleAsStart = cycles.find((c) => c.startDate === iso);
    const cycleAsHefsek = cycles.find((c) => c.hefsekDate === iso);

    if (cycleAsHefsek) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm('לבטל את רישום הפסק הטהרה ביום זה?')) {
          setCycles((prev) => prev.map((c) => c.id === cycleAsHefsek.id ? { ...c, hefsekDate: undefined } : c));
          if (isSupabaseConfigured && userId !== 'demo') {
            clearHefsek(cycleAsHefsek.id).catch(() => {});
          }
        }
        return;
      }
      Alert.alert('ביטול הפסק טהרה', 'לבטל את רישום הפסק הטהרה ביום זה?', [
        { text: t.cancel, style: 'cancel' },
        { text: 'אישור', style: 'destructive', onPress: () => {
          setCycles((prev) => prev.map((c) => c.id === cycleAsHefsek.id ? { ...c, hefsekDate: undefined } : c));
          if (isSupabaseConfigured && userId !== 'demo') {
            clearHefsek(cycleAsHefsek.id).catch(() => {});
          }
        }},
      ]);
      return;
    }

    if (cycleAsStart) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        if (window.confirm('למחוק את רישום הוסת מיום זה?')) {
          setCycles((prev) => prev.filter((c) => c.id !== cycleAsStart.id));
          if (isSupabaseConfigured && userId !== 'demo') {
            deleteCycle(cycleAsStart.id).catch(() => {});
          }
        }
        return;
      }
      Alert.alert('מחיקת רישום וסת', 'למחוק את רישום הוסת מיום זה?', [
        { text: t.cancel, style: 'cancel' },
        { text: 'מחקי', style: 'destructive', onPress: () => {
          setCycles((prev) => prev.filter((c) => c.id !== cycleAsStart.id));
          if (isSupabaseConfigured && userId !== 'demo') {
            deleteCycle(cycleAsStart.id).catch(() => {});
          }
        }},
      ]);
    }
  }, [cycles, userId, t]);

  const handleConfirmCycle = useCallback(
    async (date: Date, onah: Onah) => {
      const hd = toHebrewDate(date);
      const entry: CycleEntry = {
        id: uuidv4(),
        userId,
        startDate: isoOf(date),
        hebrewDate: hd.display,
        onah,
        createdAt: new Date().toISOString(),
      };

      setCycles((prev) => [...prev, entry]);
      setShowEntryModal(false);

      const result = calculateVesetDates({
        startDate: entry.startDate,
        hebrewDate: entry.hebrewDate,
        onah: entry.onah,
        latitude: userLatitude,
        longitude: userLongitude,
        profile: halachicProfile,
        previousCycles: cycles,
      });

      setSaveError(null);
      if (isSupabaseConfigured && userId !== 'demo') {
        // AWAIT the save so the user can't close the app before it persists.
        // Failed saves are still kept in local state + cache as pending.
        try {
          await saveCycle(userId, entry, result);
        } catch (e: any) {
          console.warn('[Calendar] saveCycle failed (kept locally):', e);
          // The entry IS saved locally in state + cache — surface a calm
          // notice rather than a scary error. Data isn't lost.
          setSaveError('הנתון נשמר במכשיר. הסנכרון לענן ימשיך ברקע.');
        }
      }

      scheduleNotificationsForCycle(result, entry.startDate, halachicProfile).catch(() => {});
    },
    [userId, cycles, halachicProfile, userLatitude, userLongitude]
  );

  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.lockScreen}>
        <View style={styles.lockContent}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.lockTitle}>SIEL</Text>
          <Text style={styles.lockSubtitle}>{t.lockSubtitle}</Text>
          {authError && <Text style={styles.lockError}>{authError}</Text>}
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={authenticate}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Text style={styles.unlockText}>{t.unlockButton}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cycleDates = cycles.map((c) => c.startDate);
  const hefsekDate = latestResult?.hefsekTaharahDate;
  const mikvehDate = latestResult?.mikvehNight;

  const cleanDays = useMemo<string[]>(() => {
    if (!hefsekDate) return [];
    const days: string[] = [];
    const start = new Date(hefsekDate + 'T00:00:00');
    for (let i = 1; i <= 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${dd}`);
    }
    return days;
  }, [hefsekDate]);

  // Days from latest cycle start until hefsek (or today if no hefsek yet) — excluding the start day itself
  const inCycleDays = useMemo<string[]>(() => {
    if (!latestCycle) return [];
    const days: string[] = [];
    const start = new Date(latestCycle.startDate + 'T00:00:00');
    const todayIso = isoOf(today);
    const endIso = latestCycle.hefsekDate || todayIso;
    const end = new Date(endIso + 'T00:00:00');
    const cursor = new Date(start);
    cursor.setDate(cursor.getDate() + 1);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${dd}`;
      if (iso !== latestCycle.hefsekDate) days.push(iso);
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [latestCycle, today]);

  // Pregnancy mode: replace the entire calendar view with the pregnancy
  // tracker. This is the user's primary view while pregnant.
  if (isPregnant && pregnancyLmp && userId && userId !== 'demo') {
    return (
      <PregnancyScreen
        userId={userId}
        lmp={pregnancyLmp}
        onBabyBorn={handleBabyBorn}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.appName}>SIEL</Text>
          <Text style={styles.headerSub}>{t.calendarTitle}</Text>
        </View>

        {userId !== 'demo' && (
          <TouchableOpacity
            style={styles.pregnancyEntryBtn}
            onPress={() => setShowPregnancyStart(true)}
            activeOpacity={0.7}
          >
            <Feather name="heart" size={14} color={colors.primary.rose} />
            <Text style={styles.pregnancyEntryText}>מעבר ללוח הריון</Text>
          </TouchableOpacity>
        )}

        <PregnancyStartModal
          visible={showPregnancyStart}
          onClose={() => setShowPregnancyStart(false)}
          onConfirm={handleStartPregnancy}
        />

        <StatusBanner status={bannerStatus} />

        <MonthlyCalendar
          year={year}
          month={month}
          vesetDates={allVesetDates}
          cycleDates={cycleDates}
          hefsekDate={hefsekDate}
          mikvehDate={mikvehDate}
          cleanDays={cleanDays}
          inCycleDays={inCycleDays}
          onDayPress={handleDayPress}
          onDayLongPress={handleDayLongPress}
          onPrevMonth={() => {
            if (month === 0) { setMonth(11); setYear((y) => y - 1); }
            else setMonth((m) => m - 1);
          }}
          onNextMonth={() => {
            if (month === 11) { setMonth(0); setYear((y) => y + 1); }
            else setMonth((m) => m + 1);
          }}
        />

        {saveError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        )}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { setSelectedDate(today); setShowEntryModal(true); }}
            activeOpacity={0.85}
          >
            <Text style={styles.addBtnText}>{t.logCycleToday}</Text>
          </TouchableOpacity>

          {canRecordHefsek && (
            <TouchableOpacity style={styles.hefsekBtn} onPress={handleHefsekToday} activeOpacity={0.85}>
              <Text style={styles.hefsekBtnText}>{t.hefsekTahara}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.longPressHint}>
          לחיצה ארוכה על יום במחזור — ביטול הפעולה
        </Text>
      </ScrollView>

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
            onLogHefsek={handleHefsekForDate}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.cream },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 6 },
  appName: { fontSize: 22, fontWeight: '800', color: colors.primary.gold, letterSpacing: 4 },
  headerSub: { fontSize: typography.size.sm, color: colors.neutral.textLight, marginTop: 0 },
  pregnancyEntryBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary.rosePale,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary.roseLight,
  },
  pregnancyEntryText: { color: colors.primary.rose, fontWeight: '600', fontSize: typography.size.sm },
  btnRow: { marginHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  errorBox: { marginHorizontal: spacing.lg, marginTop: spacing.md, backgroundColor: '#FEE2E2', borderRadius: 10, padding: spacing.md, borderWidth: 0.5, borderColor: '#FCA5A5' },
  errorText: { color: '#B91C1C', fontSize: typography.size.sm, textAlign: 'right' },
  addBtn: {
    backgroundColor: colors.neutral.cream, borderRadius: 14, paddingVertical: spacing.md,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary.goldLight,
  },
  addBtnText: { color: colors.primary.gold, fontSize: typography.size.md, fontWeight: '700' },
  hefsekBtn: { backgroundColor: colors.primary.gold, borderRadius: 14, paddingVertical: spacing.md, alignItems: 'center' },
  hefsekBtnText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
  longPressHint: {
    textAlign: 'center',
    color: colors.neutral.textMuted,
    fontSize: typography.size.xs,
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    opacity: 0.7,
  },
  lockScreen: { flex: 1, backgroundColor: colors.neutral.beige },
  lockContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl },
  lockIcon: { fontSize: 48, marginBottom: spacing.md },
  lockTitle: { fontSize: typography.size.title, fontWeight: '800', color: colors.primary.gold, letterSpacing: 6, marginBottom: spacing.xs },
  lockSubtitle: { fontSize: typography.size.md, color: colors.neutral.textLight, marginBottom: spacing.xl, textAlign: 'center' },
  lockError: { color: colors.status.alert, fontSize: typography.size.sm, marginBottom: spacing.md, textAlign: 'center' },
  unlockBtn: {
    backgroundColor: colors.primary.gold, borderRadius: 50, paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl, minWidth: 260, alignItems: 'center',
  },
  unlockText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
});
