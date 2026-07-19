import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { supabase } from '../../config/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isValid = email.includes('@') && password.length >= 6;

  async function handleSubmit() {
    if (!isValid) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (mode === 'login') {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password });
        if (e) throw e;
        // Don't call onLogin() — AppNavigator's useEffect will trigger onboarding
        // only if the profile is actually empty (new account).
      } else if (mode === 'register') {
        const { data, error: e } = await supabase.auth.signUp({ email, password });
        if (e) {
          // Email already exists — try to sign in with the provided password
          // (handles the case where the same email is already registered, e.g.
          // a beauty pro registering for the consumer app with her business email)
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes('already') || msg.includes('User already registered')) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
            if (!signInErr) return;
            setError('המייל הזה כבר רשום. אם זה אותך — לחצי על "כניסה" למעלה והשתמשי באותה סיסמה.');
            return;
          }
          throw e;
        }
        if (data.session) {
          return;
        }
        // Email confirmation required — try to sign in directly
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInErr) return;
        setSuccessMsg(t.emailSent);
        setMode('login');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.error;
      if (msg.includes('Invalid login')) setError(t.invalidLogin);
      else if (msg.includes('already')) setError('המייל הזה כבר רשום. לחצי על "כניסה" למעלה.');
      else setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.includes('@')) return;
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'siel://reset-password';
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (e) throw e;
      setSuccessMsg(t.resetEmailSent);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t.error);
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>SIEL</Text>
          <Text style={styles.tagline}>{t.tagline}</Text>

          {mode === 'forgot' ? (
            <View style={styles.card}>
              <Text style={styles.forgotTitle}>{t.forgotPasswordTitle}</Text>
              <Text style={styles.forgotDesc}>{t.forgotPasswordDesc}</Text>

              <Text style={styles.label}>{t.emailLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.neutral.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                importantForAutofill="yes"
                textAlign="left"
              />

              {error && <Text style={styles.error}>{error}</Text>}
              {successMsg && <Text style={styles.success}>{successMsg}</Text>}

              <TouchableOpacity
                style={[styles.submitBtn, !email.includes('@') && styles.submitBtnDisabled]}
                disabled={!email.includes('@') || isLoading}
                onPress={handleForgotPassword}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <Text style={styles.submitText}>{t.sendResetLink}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backLink}
                onPress={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              >
                <Text style={styles.backLinkText}>{t.backToLogin}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.modeRow}>
                {(['login', 'register'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                    onPress={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                  >
                    <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                      {m === 'login' ? t.login : t.register}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>{t.emailLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.neutral.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={mode === 'register' ? 'email' : 'username'}
                textContentType={mode === 'register' ? 'emailAddress' : 'username'}
                importantForAutofill="yes"
                textAlign="left"
              />

              <Text style={styles.label}>{t.loginPassLabel}</Text>
              <TextInput
                style={styles.input}
                placeholder={t.loginPassHint}
                placeholderTextColor={colors.neutral.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                textContentType={mode === 'register' ? 'newPassword' : 'password'}
                importantForAutofill="yes"
                textAlign="left"
              />

              {mode === 'login' && (
                <TouchableOpacity
                  style={styles.forgotLink}
                  onPress={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                >
                  <Text style={styles.forgotLinkText}>{t.forgotPassword}</Text>
                </TouchableOpacity>
              )}

              {error && <Text style={styles.error}>{error}</Text>}
              {successMsg && <Text style={styles.success}>{successMsg}</Text>}

              <TouchableOpacity
                style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
                disabled={!isValid || isLoading}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login' ? t.loginBtn : t.createAccountBtn}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.privacy}>{t.privacyNote}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  flex: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 60, fontWeight: '800', color: colors.primary.gold, letterSpacing: 10, marginBottom: spacing.xs },
  tagline: { fontSize: typography.size.md, color: colors.neutral.textLight, marginBottom: spacing.xxl },
  card: {
    backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl,
    width: '100%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  modeRow: {
    flexDirection: 'row', backgroundColor: colors.neutral.beige, borderRadius: borderRadius.md,
    padding: 4, marginBottom: spacing.lg,
  },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.neutral.white },
  modeBtnText: { fontSize: typography.size.md, color: colors.neutral.textMuted, fontWeight: '500' },
  modeBtnTextActive: { color: colors.neutral.text, fontWeight: '700' },
  label: { fontSize: typography.size.sm, color: colors.neutral.textMuted, fontWeight: '600', marginBottom: spacing.xs, textAlign: 'right' },
  input: {
    backgroundColor: colors.neutral.beige, borderRadius: borderRadius.md, padding: spacing.md,
    fontSize: typography.size.md, color: colors.neutral.text, marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'transparent',
  },
  error: { color: colors.status.alert, fontSize: typography.size.sm, textAlign: 'center', marginBottom: spacing.md },
  success: { color: colors.status.safe, fontSize: typography.size.sm, textAlign: 'center', marginBottom: spacing.md, lineHeight: 20 },
  submitBtn: { backgroundColor: colors.primary.gold, borderRadius: borderRadius.full, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.neutral.white, fontSize: typography.size.lg, fontWeight: '700' },
  privacy: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 18, paddingHorizontal: spacing.md },
  forgotLink: { alignSelf: 'flex-end', marginBottom: spacing.sm },
  forgotLinkText: { fontSize: typography.size.sm, color: colors.primary.gold },
  forgotTitle: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: spacing.sm },
  forgotDesc: { fontSize: typography.size.sm, color: colors.neutral.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  backLink: { alignItems: 'center', marginTop: spacing.md },
  backLinkText: { fontSize: typography.size.sm, color: colors.neutral.textMuted, textDecorationLine: 'underline' },
});
