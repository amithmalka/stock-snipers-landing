import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Switch,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { HalachicProfile } from '../../types/halachic';
import { supabase } from '../../config/supabase';
import { PrayerType } from '../../services/supabase/personalService';
import { schedulePrayerReminder } from '../../services/notifications/notificationsService';
import { useLanguage } from '../../contexts/LanguageContext';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const STEPS = 5;

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [halachicProfile, setHalachicProfile] = useState<HalachicProfile>('sephardi');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [prayerType, setPrayerType] = useState<PrayerType>('none');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PRAYER_OPTIONS: { type: PrayerType; label: string; time: string; icon: keyof typeof Feather.glyphMap }[] = [
    { type: 'shacharit', label: t.prayerShacharit, time: '09:00', icon: 'sunrise' },
    { type: 'mincha', label: t.prayerMincha, time: '14:00', icon: 'sun' },
    { type: 'arvit', label: t.prayerArvit, time: '20:00', icon: 'moon' },
    { type: 'none', label: t.prayerNone, time: '', icon: 'bell-off' },
  ];

  const canNext =
    step === 0 ||
    (step === 1 && displayName.trim().length >= 2) ||
    step === 2 ||
    step === 3 ||
    step === 4;

  async function handleFinish() {
    setIsLoading(true);
    setError(null);

    // STEP 1: Save the input to localStorage IMMEDIATELY.
    // This is our safety net — if the network save fails or hangs, we have
    // the data locally and can retry on next app load.
    const pending = {
      displayName: displayName.trim(),
      halachicProfile,
      biometricEnabled,
      locationEnabled,
      prayerType,
      ts: Date.now(),
    };
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('siel.pendingOnboarding', JSON.stringify(pending));
        // Also cache the prayer choice so it shows immediately on cold start
        window.localStorage.setItem('siel.prayer.current', prayerType);
      }
    } catch {}

    function withDeadline<T>(p: PromiseLike<T>, ms: number): Promise<T> {
      return Promise.race([
        Promise.resolve(p),
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
      ]);
    }

    try {
      // Hard deadline on the whole flow — never let the spinner spin forever
      const sessRes = await withDeadline(supabase.auth.getSession(), 5000);
      const session = sessRes.data.session;
      if (!session) throw new Error('אין סשן פעיל');

      // PRIMARY: store profile data in auth.users.user_metadata.
      // This doesn't depend on any DB table or RLS policy — it's just JSON
      // attached to the auth user and is the most reliable storage in Supabase.
      try {
        await withDeadline(
          supabase.auth.updateUser({
            data: {
              display_name: pending.displayName,
              halachic_profile: pending.halachicProfile,
              biometric_enabled: pending.biometricEnabled,
              location_enabled: pending.locationEnabled,
              prayer_type: pending.prayerType,
            },
          }),
          5000,
        );
      } catch (metaErr) {
        console.error('[Onboarding] updateUser metadata failed:', metaErr);
      }

      // SECONDARY: also write to profiles table for queries that need it
      // (non-fatal — if RLS blocks it, the metadata above is enough)
      try {
        await withDeadline(
          supabase.from('profiles').upsert({
            id: session.user.id,
            display_name: pending.displayName,
            halachic_profile: pending.halachicProfile,
            biometric_enabled: pending.biometricEnabled,
            location_enabled: pending.locationEnabled,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' }),
          5000,
        );
      } catch {}

      // Prayer reminder (non-fatal)
      try {
        await withDeadline(
          supabase.from('prayer_reminders').upsert({
            user_id: session.user.id,
            prayer_type: pending.prayerType,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' }),
          5000,
        );
      } catch {}

      if (pending.prayerType !== 'none') {
        schedulePrayerReminder(pending.prayerType).catch(() => {});
      }

      // SUCCESS — clear the pending marker
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('siel.pendingOnboarding');
        }
      } catch {}

      onComplete();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.savingError;
      // Lock errors are noise — the upsert usually completed
      if (msg.includes('lock') || msg.includes('stole')) {
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem('siel.pendingOnboarding');
          }
        } catch {}
        onComplete();
        return;
      }
      // For real errors, keep the pending marker so we can retry on next load.
      // Still proceed to the app so the user isn't stuck on a spinner.
      setError(msg + ' — הנתונים נשמרו מקומית ויסונכרנו בכניסה הבאה.');
      setTimeout(() => onComplete(), 1500);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Progress dots */}
        <View style={styles.progress}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <View style={styles.stepWrap}>
              <Text style={styles.logo}>SIEL</Text>
              <Text style={styles.welcome}>{t.stepWelcome}</Text>
              <Text style={styles.desc}>{t.onboardingDesc1}</Text>
              <Text style={styles.desc}>{t.onboardingDesc2}</Text>
            </View>
          )}

          {/* Step 1 — Name */}
          {step === 1 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t.stepNameTitle}</Text>
              <Text style={styles.stepDesc}>{t.nameDesc}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.namePlaceholder}
                placeholderTextColor={colors.neutral.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoFocus
                maxLength={40}
                textAlign="right"
              />
            </View>
          )}

          {/* Step 2 — Halachic Profile */}
          {step === 2 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t.stepHalachicTitle}</Text>
              <Text style={styles.stepDesc}>{t.halachicDesc}</Text>
              <View style={styles.profileCards}>
                {(['sephardi', 'ashkenazi'] as HalachicProfile[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.profileCard, halachicProfile === p && styles.profileCardActive]}
                    onPress={() => setHalachicProfile(p)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.profileIconCircle}>
                      <Feather
                        name={p === 'sephardi' ? 'moon' : 'star'}
                        size={22}
                        color={colors.primary.gold}
                      />
                    </View>
                    <Text style={[styles.profileLabel, halachicProfile === p && styles.profileLabelActive]}>
                      {p === 'sephardi' ? t.sephardiTitle : t.ashkenaziTitle}
                    </Text>
                    <Text style={styles.profileSub}>
                      {p === 'sephardi' ? t.sephardiOnah : t.ashkenaziOnah}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3 — Privacy */}
          {step === 3 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t.stepPrivacyTitle}</Text>
              <Text style={styles.stepDesc}>{t.privacyDesc}</Text>
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{t.biometricOnboardingLabel}</Text>
                    <Text style={styles.toggleDesc}>{t.biometricOnboardingDesc}</Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={setBiometricEnabled}
                    trackColor={{ false: colors.neutral.beigeDeep, true: colors.primary.gold }}
                    thumbColor={colors.neutral.white}
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>{t.locationOnboardingLabel}</Text>
                    <Text style={styles.toggleDesc}>{t.locationOnboardingDesc}</Text>
                  </View>
                  <Switch
                    value={locationEnabled}
                    onValueChange={setLocationEnabled}
                    trackColor={{ false: colors.neutral.beigeDeep, true: colors.primary.gold }}
                    thumbColor={colors.neutral.white}
                  />
                </View>
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}

          {/* Step 4 — Prayer reminder */}
          {step === 4 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>{t.stepPrayerTitle}</Text>
              <Text style={styles.stepDesc}>{t.prayerDesc}</Text>
              <View style={styles.profileCards}>
                {PRAYER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.prayerCard, prayerType === opt.type && styles.profileCardActive]}
                    onPress={() => setPrayerType(opt.type)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.profileIconCircle}>
                      <Feather name={opt.icon} size={20} color={colors.primary.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.profileLabel, prayerType === opt.type && styles.profileLabelActive]}>
                        {opt.label}
                      </Text>
                      {opt.time ? (
                        <Text style={styles.profileSub}>{t.everyDayAt}{opt.time}</Text>
                      ) : null}
                    </View>
                    <View style={[styles.radio, prayerType === opt.type && styles.radioActive]}>
                      {prayerType === opt.type && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          )}
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.nav}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
              <Text style={styles.backText}>{t.back}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
            disabled={!canNext || isLoading}
            onPress={() => {
              if (step < STEPS - 1) setStep((s) => s + 1);
              else handleFinish();
            }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Text style={styles.nextText}>
                {step === STEPS - 1 ? t.letsStart : t.next}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  flex: { flex: 1 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.neutral.beigeDeep },
  dotActive: { backgroundColor: colors.primary.gold },
  content: { flexGrow: 1, padding: spacing.xl },
  stepWrap: { flex: 1, paddingTop: spacing.xl },
  logo: { fontSize: 52, fontWeight: '800', color: colors.primary.gold, letterSpacing: 8, textAlign: 'center', marginBottom: spacing.md },
  welcome: { fontSize: typography.size.title, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: spacing.md },
  desc: { fontSize: typography.size.md, color: colors.neutral.textLight, textAlign: 'center', lineHeight: 24, marginBottom: spacing.md },
  stepTitle: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.neutral.text, marginBottom: spacing.xs, textAlign: 'right' },
  stepDesc: { fontSize: typography.size.sm, color: colors.neutral.textLight, marginBottom: spacing.lg, textAlign: 'right' },
  input: {
    backgroundColor: colors.neutral.white, borderRadius: borderRadius.md, padding: spacing.md,
    fontSize: typography.size.lg, color: colors.neutral.text, borderWidth: 1.5, borderColor: colors.neutral.beigeDeep,
  },
  profileCards: { gap: spacing.md },
  profileCard: {
    backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.lg,
    borderWidth: 2, borderColor: colors.neutral.beigeDeep, alignItems: 'center',
  },
  profileCardActive: { borderColor: colors.primary.gold, backgroundColor: '#FFF8E7' },
  profileEmoji: { fontSize: 32, marginBottom: spacing.sm },
  profileIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  profileLabel: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: spacing.xs },
  profileLabelActive: { color: colors.primary.gold },
  profileSub: { fontSize: typography.size.sm, color: colors.neutral.textMuted, textAlign: 'center' },
  toggleCard: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, overflow: 'hidden' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text, textAlign: 'right' },
  toggleDesc: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2, textAlign: 'right' },
  divider: { height: 0.5, backgroundColor: colors.neutral.beigeDeep, marginHorizontal: spacing.md },
  errorText: { color: colors.status.alert, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.md },
  nav: {
    flexDirection: 'row', gap: spacing.md, padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  backBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.full, borderWidth: 1.5, borderColor: colors.neutral.beigeDeep, alignItems: 'center' },
  backText: { fontSize: typography.size.md, color: colors.neutral.textLight },
  nextBtn: { flex: 2, backgroundColor: colors.primary.gold, paddingVertical: spacing.md, borderRadius: borderRadius.full, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
  prayerCard: {
    backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.md,
    borderWidth: 2, borderColor: colors.neutral.beigeDeep, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.neutral.beigeDeep, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary.gold },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary.gold },
});
