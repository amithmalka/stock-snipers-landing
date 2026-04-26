import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { HalachicProfile } from '../../types/halachic';
import ChatScreen from './ChatScreen';
import { useLanguage } from '../../contexts/LanguageContext';
import { findExistingConversation, deleteConversation } from '../../services/supabase/chatService';
import { isSupabaseConfigured, supabase } from '../../config/supabase';

interface AskExpertScreenProps {
  halachicProfile?: HalachicProfile;
}

export default function AskExpertScreen({ halachicProfile = 'sephardi' }: AskExpertScreenProps) {
  const { t } = useLanguage();
  const [chatOpen, setChatOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const conv = await findExistingConversation(session.user.id);
        if (!conv) return;
        const today = new Date().toDateString();
        const convDay = new Date(conv.createdAt).toDateString();
        if (convDay !== today) {
          await deleteConversation(conv.id).catch(() => {});
          return;
        }
        setChatOpen(true);
      } catch {
        // network error – show landing page
      }
    })();
  }, []);

  if (chatOpen) {
    return (
      <ChatScreen
        halachicProfile={halachicProfile}
        onBack={() => setChatOpen(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={showBanner} transparent animationType="fade" onRequestClose={() => setShowBanner(false)}>
        <View style={styles.overlay}>
          <View style={styles.popup}>
            <Text style={styles.popupEmoji}>✨</Text>
            <Text style={styles.popupTitle}>ברוכות הבאות לסיאל!</Text>
            <Text style={styles.popupBody}>
              האפליקציה שלנו חדשה ואנחנו עובדות קשה כדי להביא לכן את הטוב ביותר.
            </Text>
            <Text style={styles.popupBody}>
              כרגע אנחנו בתהליך גיוס רבנים מוסמכים שייתנו לכן מענה אישי לכל שאלה — בכל שעה, בצניעות ובכבוד.
            </Text>
            <Text style={styles.popupNote}>
              האפשרות לשאול שאלה תיפתח בקרוב. 🙏
            </Text>
            <TouchableOpacity style={styles.popupBtn} onPress={() => setShowBanner(false)} activeOpacity={0.85}>
              <Text style={styles.popupBtnText}>הבנתי, תודה!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>📖</Text>
        </View>

        <Text style={styles.title}>{t.askExpertHeroTitle}</Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>🕙</Text>
            <Text style={styles.infoText}>{t.askExpertHours}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>👤</Text>
            <Text style={styles.infoText}>{t.askExpertRealRabbi}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>🔒</Text>
            <Text style={styles.infoText}>{t.encryptedInfo}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setChatOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{t.startChat}</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{t.disclaimer}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconText: { fontSize: 36 },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  infoCard: {
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  infoEmoji: { fontSize: 18, width: 24 },
  infoText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.neutral.textLight,
    lineHeight: 20,
    textAlign: 'right',
  },
  divider: { height: 0.5, backgroundColor: colors.neutral.beigeDeep },
  button: {
    width: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.white,
    letterSpacing: 0.3,
  },
  disclaimer: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  popup: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  popupEmoji: { fontSize: 40, marginBottom: spacing.md },
  popupTitle: {
    fontSize: typography.size.xl,
    fontWeight: '700',
    color: colors.neutral.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  popupBody: {
    fontSize: typography.size.sm,
    color: colors.neutral.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  popupNote: {
    fontSize: typography.size.sm,
    color: colors.primary.gold,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  popupBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 1.5,
    alignItems: 'center',
  },
  popupBtnText: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.white,
  },
});
