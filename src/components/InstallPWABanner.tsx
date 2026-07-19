import React, { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../config/theme';

const DISMISS_KEY = 'siel_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform2 = 'ios' | 'android' | 'other' | null;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window.navigator as any).standalone === true) return true;
  return false;
}

function detectPlatform(): Platform2 {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export default function InstallPWABanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform2>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (isStandalone()) return;
    if (typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)) return;

    const p = detectPlatform();
    setPlatform(p);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (p === 'ios') {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  function dismiss() {
    setVisible(false);
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, '1');
  }

  async function handleAndroidInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') dismiss();
  }

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <TouchableOpacity style={styles.closeBtn} onPress={dismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.closeText}>×</Text>
        </TouchableOpacity>

        <Text style={styles.title}>הוסיפי את SIEL למסך הבית</Text>
        <Text style={styles.subtitle}>
          לקבלת חוויה כמו אפליקציה מלאה: התראות יומיות, פתיחה מהירה, ושימוש גם בלי רשת.
        </Text>

        {platform === 'ios' ? (
          <View style={styles.iosSteps}>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>1.</Text>  לחצי על כפתור השיתוף
              {'\n'}    בסרגל הכלים של Safari (למטה)
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>2.</Text>  גללי וסחרי <Text style={styles.bold}>"Add to Home Screen"</Text>
            </Text>
            <Text style={styles.step}>
              <Text style={styles.stepNum}>3.</Text>  לחצי <Text style={styles.bold}>"Add"</Text>
            </Text>
          </View>
        ) : platform === 'android' && installEvent ? (
          <TouchableOpacity style={styles.installBtn} onPress={handleAndroidInstall} activeOpacity={0.85}>
            <Text style={styles.installBtnText}>התקיני עכשיו</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.fallback}>
            פתחי את התפריט של הדפדפן ובחרי "Add to Home Screen" / "התקן אפליקציה"
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    zIndex: 1000,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary.gold,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.neutral.beige,
  },
  closeText: { fontSize: 20, color: colors.neutral.text, lineHeight: 22 },
  title: {
    fontSize: typography.size.lg,
    fontWeight: '700',
    color: colors.primary.gold,
    textAlign: 'right',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'right',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  iosSteps: { gap: spacing.sm },
  step: {
    fontSize: typography.size.sm,
    color: colors.neutral.text,
    textAlign: 'right',
    lineHeight: 22,
  },
  stepNum: { fontWeight: '700', color: colors.primary.gold },
  shareIcon: { fontSize: typography.size.md },
  bold: { fontWeight: '700' },
  installBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  installBtnText: {
    color: colors.neutral.white,
    fontSize: typography.size.md,
    fontWeight: '700',
  },
  fallback: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'right',
  },
});
