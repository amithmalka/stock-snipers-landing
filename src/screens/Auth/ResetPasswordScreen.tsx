import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { supabase } from '../../config/supabase';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit() {
    setError(null);
    if (password.length < 6) { setError('סיסמה חייבת להכיל לפחות 6 תווים'); return; }
    if (password !== confirm) { setError('הסיסמאות אינן תואמות'); return; }
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      setSuccess(true);
      // Redirect to app root after 2s
      setTimeout(() => {
        if (typeof window !== 'undefined') window.location.href = '/';
      }, 2000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה. נסי שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>SIEL</Text>

        <View style={styles.card}>
          <Text style={styles.title}>סיסמה חדשה</Text>

          {success ? (
            <Text style={styles.success}>הסיסמה עודכנה בהצלחה! מעבירה...</Text>
          ) : !ready ? (
            <Text style={styles.desc}>מאמתת קישור...</Text>
          ) : (
            <>
              <Text style={styles.desc}>הכניסי סיסמה חדשה לחשבונך.</Text>

              <Text style={styles.label}>סיסמה חדשה</Text>
              <TextInput
                style={styles.input}
                placeholder="לפחות 6 תווים"
                placeholderTextColor={colors.neutral.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="left"
              />

              <Text style={styles.label}>אישור סיסמה</Text>
              <TextInput
                style={styles.input}
                placeholder="הכניסי שוב"
                placeholderTextColor={colors.neutral.textMuted}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                textAlign="left"
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.btn, (loading || !password || !confirm) && styles.btnDisabled]}
                disabled={loading || !password || !confirm}
                onPress={handleSubmit}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color={colors.neutral.white} />
                  : <Text style={styles.btnText}>שמרי סיסמה חדשה</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 48, fontWeight: '800', color: colors.primary.gold, letterSpacing: 10, marginBottom: spacing.xxl },
  card: {
    backgroundColor: colors.neutral.white, borderRadius: borderRadius.xl, padding: spacing.xl,
    width: '100%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  title: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: spacing.sm },
  desc: { fontSize: typography.size.sm, color: colors.neutral.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  label: { fontSize: typography.size.sm, color: colors.neutral.textMuted, fontWeight: '600', marginBottom: spacing.xs, textAlign: 'right' },
  input: {
    backgroundColor: colors.neutral.beige, borderRadius: borderRadius.md, padding: spacing.md,
    fontSize: typography.size.md, color: colors.neutral.text, marginBottom: spacing.md,
    borderWidth: 1, borderColor: 'transparent',
  },
  error: { color: colors.status.alert, fontSize: typography.size.sm, textAlign: 'center', marginBottom: spacing.md },
  success: { color: colors.status.safe, fontSize: typography.size.md, textAlign: 'center', lineHeight: 24 },
  btn: { backgroundColor: colors.primary.gold, borderRadius: borderRadius.full, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.xs },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.neutral.white, fontSize: typography.size.lg, fontWeight: '700' },
});
