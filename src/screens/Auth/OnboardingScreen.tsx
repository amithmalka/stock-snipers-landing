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
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { HalachicProfile } from '../../types/halachic';
import { supabase } from '../../config/supabase';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const STEPS = ['ברוכה הבאה', 'שמך', 'הפרופיל ההלכתי', 'הגדרות פרטיות'];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [halachicProfile, setHalachicProfile] = useState<HalachicProfile>('sephardi');
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    step === 0 ||
    (step === 1 && displayName.trim().length >= 2) ||
    step === 2 ||
    step === 3;

  async function handleFinish() {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');
      await supabase.from('profiles').upsert({
        id: session.user.id,
        display_name: displayName.trim(),
        halachic_profile: halachicProfile,
        biometric_enabled: biometricEnabled,
        location_enabled: locationEnabled,
        updated_at: new Date().toISOString(),
      });
      onComplete();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירת הפרטים');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress dots */}
        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i <= step && styles.dotActive]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <View style={styles.stepWrap}>
              <Text style={styles.logo}>SIEL</Text>
              <Text style={styles.welcome}>ברוכה הבאה</Text>
              <Text style={styles.desc}>
                SIEL היא אפליקציית הניהול ההלכתי האישית שלך — אלגנטית, פרטית ומדויקת.
              </Text>
              <Text style={styles.desc}>
                נבנה יחד את הפרופיל שלך בכמה צעדים פשוטים.
              </Text>
            </View>
          )}

          {/* Step 1 — Name */}
          {step === 1 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>מה שמך?</Text>
              <Text style={styles.stepDesc}>השם יוצג לך בלבד ולא ישותף</Text>
              <TextInput
                style={styles.input}
                placeholder="שמך הפרטי"
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
              <Text style={styles.stepTitle}>הפרופיל ההלכתי</Text>
              <Text style={styles.stepDesc}>
                הבחירה משפיעה על חישוב הוסתות, ימי ספירה ועוד
              </Text>
              <View style={styles.profileCards}>
                {(['sephardi', 'ashkenazi'] as HalachicProfile[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.profileCard,
                      halachicProfile === p && styles.profileCardActive,
                    ]}
                    onPress={() => setHalachicProfile(p)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.profileEmoji}>
                      {p === 'sephardi' ? '🌙' : '⭐'}
                    </Text>
                    <Text style={[styles.profileLabel, halachicProfile === p && styles.profileLabelActive]}>
                      {p === 'sephardi' ? 'ספרדיה\n(מרן / טהרת יוסף)' : 'אשכנזיה\n(רמ"א)'}
                    </Text>
                    <Text style={styles.profileSub}>
                      {p === 'sephardi'
                        ? 'עונה בינונית — יום 30 בלבד'
                        : 'עונה בינונית — ימים 30 ו-31, אור זרוע'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 3 — Privacy */}
          {step === 3 && (
            <View style={styles.stepWrap}>
              <Text style={styles.stepTitle}>הגדרות פרטיות</Text>
              <Text style={styles.stepDesc}>
                ניתן לשנות את ההגדרות בכל עת מהפרופיל
              </Text>
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleInfo}>
                    <Text style={styles.toggleLabel}>נעילה ביומטרית</Text>
                    <Text style={styles.toggleDesc}>Face ID / טביעת אצבע לכניסה לאפליקציה</Text>
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
                    <Text style={styles.toggleLabel}>מיקום</Text>
                    <Text style={styles.toggleDesc}>למציאת שירותי יופי קרובים ולחישוב זמני היום</Text>
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
        </ScrollView>

        {/* Navigation buttons */}
        <View style={styles.nav}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
              <Text style={styles.backText}>חזרה</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canNext && styles.nextBtnDisabled]}
            disabled={!canNext || isLoading}
            onPress={() => {
              if (step < STEPS.length - 1) setStep((s) => s + 1);
              else handleFinish();
            }}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.neutral.white} />
            ) : (
              <Text style={styles.nextText}>
                {step === STEPS.length - 1 ? 'בואי נתחיל ✨' : 'המשך'}
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
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.beigeDeep,
  },
  dotActive: { backgroundColor: colors.primary.gold },
  content: { flexGrow: 1, padding: spacing.xl },
  stepWrap: { flex: 1, paddingTop: spacing.xl },
  logo: {
    fontSize: 52,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  welcome: {
    fontSize: typography.size.title,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  desc: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.neutral.text,
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  stepDesc: {
    fontSize: typography.size.sm,
    color: colors.neutral.textLight,
    marginBottom: spacing.lg,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.size.lg,
    color: colors.neutral.text,
    borderWidth: 1.5,
    borderColor: colors.neutral.beigeDeep,
  },
  profileCards: { gap: spacing.md },
  profileCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.neutral.beigeDeep,
    alignItems: 'center',
  },
  profileCardActive: { borderColor: colors.primary.gold, backgroundColor: '#FFF8E7' },
  profileEmoji: { fontSize: 32, marginBottom: spacing.sm },
  profileLabel: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  profileLabelActive: { color: colors.primary.gold },
  profileSub: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'center',
  },
  toggleCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: {
    fontSize: typography.size.md,
    fontWeight: '600',
    color: colors.neutral.text,
    textAlign: 'right',
  },
  toggleDesc: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  divider: { height: 0.5, backgroundColor: colors.neutral.beigeDeep, marginHorizontal: spacing.md },
  errorText: {
    color: colors.status.alert,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  backBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.neutral.beigeDeep,
    alignItems: 'center',
  },
  backText: { fontSize: typography.size.md, color: colors.neutral.textLight },
  nextBtn: {
    flex: 2,
    backgroundColor: colors.primary.gold,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.5 },
  nextText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
});
