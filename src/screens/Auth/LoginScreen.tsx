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

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
        onLogin();
      } else {
        const { error: e } = await supabase.auth.signUp({ email, password });
        if (e) throw e;
        setSuccessMsg('נשלח אליך אימות למייל. אנא אשרי את כתובתך ואז התחברי.');
        setMode('login');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'שגיאה';
      if (msg.includes('Invalid login')) setError('אימייל או סיסמה שגויים');
      else if (msg.includes('already registered')) setError('כתובת המייל כבר רשומה');
      else setError(msg);
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
          <Text style={styles.tagline}>ניהול הלכתי אלגנטי</Text>

          <View style={styles.card}>
            {/* Mode toggle */}
            <View style={styles.modeRow}>
              {(['login', 'register'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                  onPress={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                >
                  <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                    {m === 'login' ? 'כניסה' : 'הרשמה'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Fields */}
            <Text style={styles.label}>כתובת מייל</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={colors.neutral.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textAlign="left"
            />

            <Text style={styles.label}>סיסמה</Text>
            <TextInput
              style={styles.input}
              placeholder="לפחות 6 תווים"
              placeholderTextColor={colors.neutral.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textAlign="left"
            />

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
                  {mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.privacy}>
            הנתונים שלך מוצפנים ומאובטחים. SIEL לעולם לא תשתף מידע אישי.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logo: {
    fontSize: 60,
    fontWeight: '800',
    color: colors.primary.gold,
    letterSpacing: 10,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: typography.size.md,
    color: colors.neutral.textLight,
    marginBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: colors.neutral.white },
  modeBtnText: { fontSize: typography.size.md, color: colors.neutral.textMuted, fontWeight: '500' },
  modeBtnTextActive: { color: colors.neutral.text, fontWeight: '700' },
  label: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'right',
  },
  input: {
    backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.size.md,
    color: colors.neutral.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  error: {
    color: colors.status.alert,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  success: {
    color: colors.status.safe,
    fontSize: typography.size.sm,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.neutral.white, fontSize: typography.size.lg, fontWeight: '700' },
  privacy: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
});
