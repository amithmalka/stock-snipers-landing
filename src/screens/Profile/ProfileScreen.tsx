import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { HalachicProfile } from '../../types/halachic';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  fetchMyAppointments,
  fetchPrayerReminder,
  savePrayerReminder,
  fetchKabbalot,
  addKabbalah,
  deleteKabbalah,
  PrayerType,
  UserAppointment,
  Kabbalah,
} from '../../services/supabase/personalService';
import {
  schedulePrayerReminder,
  cancelPrayerReminder,
} from '../../services/notifications/notificationsService';
import { subscribeToWebPush, getWebPushPermission } from '../../services/notifications/webPushService';

export default function ProfileScreen() {
  const { user, isDemoMode, signOut, updateProfile } = useAuth();
  const { t, lang, setLang } = useLanguage();

  const PRAYER_OPTIONS: { type: PrayerType; label: string; time: string; icon: keyof typeof Feather.glyphMap }[] = [
    { type: 'shacharit', label: t.prayerShacharit, time: '09:00', icon: 'sunrise' },
    { type: 'mincha', label: t.prayerMincha, time: '14:00', icon: 'sun' },
    { type: 'arvit', label: t.prayerArvit, time: '20:00', icon: 'moon' },
    { type: 'none', label: t.prayerNone, time: '', icon: 'bell-off' },
  ];

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pending: { label: t.statusPending, color: '#F59E0B' },
    provider_confirmed: { label: t.statusConfirmed, color: '#10B981' },
    cancelled: { label: t.statusCancelled, color: '#EF4444' },
  };

  // Appointments — cached in localStorage so cold-start shows immediately
  const apptCacheKey = 'siel.appts.current';
  const cachedAppts: UserAppointment[] = (() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = window.localStorage.getItem(apptCacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();
  const [appointments, setAppointments] = useState<UserAppointment[]>(cachedAppts);
  const [apptLoading, setApptLoading] = useState(false);

  // Prayer (cached in localStorage so cold-start shows last-known value)
  const prayerCacheKey = 'siel.prayer.current';
  const cachedPrayer: PrayerType = (() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return 'none';
      const v = window.localStorage.getItem(prayerCacheKey);
      return (v === 'shacharit' || v === 'mincha' || v === 'arvit') ? v : 'none';
    } catch { return 'none'; }
  })();
  const [prayerType, setPrayerType] = useState<PrayerType>(cachedPrayer);

  // Kabbalot
  const [kabbalot, setKabbalot] = useState<Kabbalah[]>([]);
  const [newKabbalah, setNewKabbalah] = useState('');

  // Local profile settings
  const [halachicProfile, setHalachicProfile] = useState<HalachicProfile>(
    user?.halachicProfile ?? 'sephardi',
  );
  const [biometric, setBiometric] = useState(user?.biometricEnabled ?? false);
  const [location, setLocation] = useState(user?.locationEnabled ?? true);

  // Web push permission state
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | 'unsupported'>('default');
  const [notifBusy, setNotifBusy] = useState(false);

  // Phone editing state
  const [phoneInput, setPhoneInput] = useState(user?.phone ?? '');
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    setPhoneInput(user?.phone ?? '');
  }, [user?.phone]);

  async function handleSavePhone() {
    const clean = phoneInput.trim();
    if (clean === (user?.phone ?? '')) return;
    setPhoneSaving(true);
    try {
      await updateProfile({ phone: clean });
    } catch (e) {
      Alert.alert('שגיאה בשמירת הטלפון', e instanceof Error ? e.message : '');
    } finally {
      setPhoneSaving(false);
    }
  }

  useEffect(() => {
    setNotifPerm(getWebPushPermission());
  }, []);

  async function handleEnableNotifications() {
    if (!user?.id) return;
    setNotifBusy(true);
    const status = await subscribeToWebPush(user.id);
    setNotifPerm(getWebPushPermission());
    setNotifBusy(false);
    if (status === 'denied') {
      Alert.alert('', t.notifDenied);
    } else if (status === 'misconfigured' || status === 'error') {
      Alert.alert('', t.error);
    }
  }

  const loadData = useCallback(async () => {
    if (!user?.id || isDemoMode) return;
    // Only show spinner if no appointments are cached yet — cached prayer
    // already shows immediately via initial state.
    if (appointments.length === 0) setApptLoading(true);
    const safety = setTimeout(() => setApptLoading(false), 5000);
    // Use null-marker on failure so we don't WIPE existing state when a fetch fails
    const FAILED = Symbol('failed');
    try {
      const [appts, prayer, kab] = await Promise.all([
        fetchMyAppointments(user.id).catch(() => FAILED),
        fetchPrayerReminder(user.id).catch(() => FAILED),
        fetchKabbalot(user.id).catch(() => FAILED),
      ]);
      if (appts !== FAILED) {
        const a = appts as UserAppointment[];
        setAppointments(a);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(apptCacheKey, JSON.stringify(a));
          }
        } catch {}
      }
      if (prayer !== FAILED) {
        const p = prayer as PrayerType;
        setPrayerType(p);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(prayerCacheKey, p);
          }
        } catch {}
      }
      if (kab !== FAILED) setKabbalot(kab as Kabbalah[]);
    } finally {
      clearTimeout(safety);
      setApptLoading(false);
    }
  }, [user?.id, isDemoMode]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  async function handlePrayerChange(type: PrayerType) {
    setPrayerType(type);
    // Persist immediately so the choice survives a PWA cold start even if the
    // network save below hasn't completed yet.
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('siel.prayer.current', type);
      }
    } catch {}
    if (!user?.id) return;
    try {
      await savePrayerReminder(user.id, type);
    } catch (e) {
      console.error('[Profile] savePrayerReminder failed:', e);
      const msg = e instanceof Error ? e.message : 'שמירת התפילה נכשלה';
      Alert.alert('שגיאה בשמירה', msg + '\n\nנסי להתנתק ולהתחבר שוב.');
      return;
    }
    if (type === 'none') {
      cancelPrayerReminder().catch(() => {});
    } else {
      schedulePrayerReminder(type).catch(() => {});
      subscribeToWebPush(user.id).catch(() => {});
    }
  }

  async function handleAddKabbalah() {
    const text = newKabbalah.trim();
    if (!text || !user?.id) return;
    const item = await addKabbalah(user.id, text);
    if (item) {
      setKabbalot((prev) => [item, ...prev]);
      setNewKabbalah('');
    }
  }

  async function handleDeleteKabbalah(id: string) {
    await deleteKabbalah(id);
    setKabbalot((prev) => prev.filter((k) => k.id !== id));
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm(`${t.signOutTitle}\n\n${t.signOutMsg}`);
      if (ok) signOut();
      return;
    }
    Alert.alert(t.signOutTitle, t.signOutMsg, [
      { text: t.cancel, style: 'cancel' },
      { text: t.signOut, style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.displayName?.[0] ?? ''}</Text>
          </View>
          <Text style={styles.displayName}>{user?.displayName || t.myProfileFallback}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
        </View>

        {/* ── My Appointments ── */}
        <Text style={styles.sectionTitle}>{t.myAppointments}</Text>
        <View style={styles.card}>
          {isDemoMode ? (
            <Text style={styles.emptyText}>{t.loginToSeeAppts}</Text>
          ) : apptLoading ? (
            <ActivityIndicator color={colors.primary.gold} style={{ padding: spacing.lg }} />
          ) : appointments.length === 0 ? (
            <Text style={styles.emptyText}>{t.noAppointments}</Text>
          ) : (
            appointments.map((appt, i) => {
              const dt = new Date(appt.slotStart);
              const locale = lang === 'he' ? 'he-IL' : 'en-US';
              const dateStr = dt.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
              const timeStr = dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
              const st = STATUS_LABELS[appt.status] ?? STATUS_LABELS.pending;
              return (
                <View key={appt.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.apptRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.apptProvider}>{appt.providerName}</Text>
                      <Text style={styles.apptTime}>{dateStr} · {timeStr}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '22' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Phone (for WhatsApp reminders) ── */}
        {!isDemoMode && (
          <>
            <Text style={styles.sectionTitle}>{t.phoneSection}</Text>
            <View style={styles.card}>
              <View style={styles.phoneRow}>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="050-1234567"
                  placeholderTextColor={colors.neutral.textMuted}
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  textAlign="left"
                  maxLength={15}
                />
                <TouchableOpacity
                  style={[
                    styles.phoneSaveBtn,
                    (phoneSaving || phoneInput.trim() === (user?.phone ?? '')) && styles.phoneSaveBtnDisabled,
                  ]}
                  onPress={handleSavePhone}
                  disabled={phoneSaving || phoneInput.trim() === (user?.phone ?? '')}
                >
                  {phoneSaving ? (
                    <ActivityIndicator color={colors.neutral.white} size="small" />
                  ) : (
                    <Text style={styles.phoneSaveBtnText}>{t.save}</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.phoneHint}>{t.phoneHint}</Text>
            </View>
          </>
        )}

        {/* ── Web Notifications (PWA only) ── */}
        {Platform.OS === 'web' && notifPerm !== 'unsupported' && (
          <>
            <Text style={styles.sectionTitle}>{t.notifications}</Text>
            <View style={styles.card}>
              {notifPerm === 'granted' ? (
                <View style={styles.notifRow}>
                  <Text style={styles.notifEnabled}>{t.notifEnabled}</Text>
                  <Text style={styles.notifDesc}>{t.notifEnableDesc}</Text>
                </View>
              ) : notifPerm === 'denied' ? (
                <View style={styles.notifRow}>
                  <Text style={styles.notifBlocked}>{t.notifDenied}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.notifBtn}
                  onPress={handleEnableNotifications}
                  disabled={notifBusy}
                  activeOpacity={0.8}
                >
                  {notifBusy ? (
                    <ActivityIndicator color={colors.neutral.white} />
                  ) : (
                    <>
                      <Text style={styles.notifBtnText}>{t.enableNotifications}</Text>
                      <Text style={styles.notifBtnSub}>{t.notifEnableDesc}</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* ── Prayer Reminder ── */}
        <Text style={styles.sectionTitle}>{t.prayerReminder}</Text>
        <View style={styles.card}>
          {PRAYER_OPTIONS.map((opt, i) => (
            <React.Fragment key={opt.type}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.prayerRow}
                onPress={() => handlePrayerChange(opt.type)}
                activeOpacity={0.7}
              >
                <View style={styles.prayerIconCircle}>
                  <Feather name={opt.icon} size={18} color={colors.primary.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.prayerLabel}>{opt.label}</Text>
                  {opt.time ? <Text style={styles.prayerTime}>{t.everyDayAt}{opt.time}</Text> : null}
                </View>
                <View style={[styles.radio, prayerType === opt.type && styles.radioActive]}>
                  {prayerType === opt.type && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Kabbalot ── */}
        <Text style={styles.sectionTitle}>{t.myKabbalot}</Text>
        <View style={styles.card}>
          <View style={styles.kabbalahInput}>
            <TextInput
              style={styles.kabbalahField}
              placeholder={t.kabbalotPlaceholder}
              placeholderTextColor={colors.neutral.textMuted}
              value={newKabbalah}
              onChangeText={setNewKabbalah}
              textAlign={lang === 'he' ? 'right' : 'left'}
              multiline={false}
              returnKeyType="done"
              onSubmitEditing={handleAddKabbalah}
            />
            <TouchableOpacity style={styles.kabbalahAddBtn} onPress={handleAddKabbalah}>
              <Text style={styles.kabbalahAddText}>+</Text>
            </TouchableOpacity>
          </View>
          {kabbalot.length > 0 && <View style={styles.divider} />}
          {kabbalot.map((k, i) => (
            <View key={k.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.kabbalahRow}>
                <Text style={styles.kabbalahBullet}>✦</Text>
                <Text style={styles.kabbalahText}>{k.text}</Text>
                <TouchableOpacity onPress={() => handleDeleteKabbalah(k.id)}>
                  <Text style={styles.kabbalahDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {kabbalot.length === 0 && newKabbalah === '' && (
            <Text style={styles.emptyTextSmall}>{t.addKabbalot}</Text>
          )}
        </View>

        {/* ── Halachic Profile ── */}
        <Text style={styles.sectionTitle}>{t.halachicProfile}</Text>
        <View style={styles.card}>
          {(['sephardi', 'ashkenazi'] as HalachicProfile[]).map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.profileOption}
                onPress={() => {
                  setHalachicProfile(p);
                  updateProfile({ halachicProfile: p });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.profileOptionLeft}>
                  <View style={styles.profileIconCircle}>
                    <Feather
                      name={p === 'sephardi' ? 'moon' : 'star'}
                      size={20}
                      color={colors.primary.gold}
                    />
                  </View>
                  <View>
                    <Text style={styles.profileLabel}>
                      {p === 'sephardi' ? t.sephardiLabel : t.ashkenaziLabel}
                    </Text>
                    <Text style={styles.profileSub}>
                      {p === 'sephardi' ? t.sephardiSub : t.ashkenaziSub}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radio, halachicProfile === p && styles.radioActive]}>
                  {halachicProfile === p && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ── Privacy ── */}
        <Text style={styles.sectionTitle}>{t.privacySecurity}</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Feather name="lock" size={20} color={colors.primary.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t.biometricLock}</Text>
              <Text style={styles.switchDesc}>{t.biometricDesc}</Text>
            </View>
            <Switch
              value={biometric}
              onValueChange={(v) => { setBiometric(v); updateProfile({ biometricEnabled: v }); }}
              trackColor={{ false: colors.neutral.beigeDeep, true: colors.primary.gold }}
              thumbColor={colors.neutral.white}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <Feather name="map-pin" size={20} color={colors.primary.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>{t.locationSharing}</Text>
              <Text style={styles.switchDesc}>{t.locationDesc}</Text>
            </View>
            <Switch
              value={location}
              onValueChange={(v) => { setLocation(v); updateProfile({ locationEnabled: v }); }}
              trackColor={{ false: colors.neutral.beigeDeep, true: colors.primary.gold }}
              thumbColor={colors.neutral.white}
            />
          </View>
        </View>

        {/* ── Language ── */}
        <Text style={styles.sectionTitle}>{t.language}</Text>
        <View style={styles.card}>
          <View style={styles.langRow}>
            {(['he', 'en'] as const).map((l, i) => (
              <React.Fragment key={l}>
                {i > 0 && <View style={styles.langDivider} />}
                <TouchableOpacity
                  style={styles.langOption}
                  onPress={() => setLang(l)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.langFlag}>{l === 'he' ? '🇮🇱' : '🇬🇧'}</Text>
                  <Text style={styles.langLabel}>{l === 'he' ? 'עברית' : 'English'}</Text>
                  <View style={[styles.radio, lang === l && styles.radioActive]}>
                    {lang === l && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t.signOut}</Text>
        </TouchableOpacity>

        {/* Data deletion */}
        <TouchableOpacity
          style={styles.deletionLink}
          onPress={() => Linking.openURL('https://siel-beta.vercel.app/delete-account')}
        >
          <Text style={styles.deletionLinkText}>
            {lang === 'he' ? 'בקשת מחיקת נתונים' : 'Request data deletion'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{t.footer}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.cream },
  profileHeader: { alignItems: 'center', padding: spacing.xl, paddingBottom: spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary.goldLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.neutral.white },
  displayName: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral.text },
  email: { fontSize: typography.size.sm, color: colors.neutral.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: typography.size.sm, fontWeight: '700', color: colors.neutral.textMuted,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.xs, letterSpacing: 0.5, textAlign: 'right',
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    marginHorizontal: spacing.lg, marginBottom: spacing.lg, overflow: 'hidden',
    shadowColor: '#A87872', shadowOpacity: 0.22, shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  divider: { height: 0.5, backgroundColor: colors.neutral.beigeDeep, marginHorizontal: spacing.md },
  emptyText: {
    textAlign: 'center', color: colors.neutral.textMuted,
    fontSize: typography.size.sm, padding: spacing.lg,
  },
  emptyTextSmall: {
    color: colors.neutral.textMuted, fontSize: typography.size.xs,
    padding: spacing.md, textAlign: 'right',
  },
  // Appointments
  apptRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  apptProvider: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text, textAlign: 'right' },
  apptTime: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2, textAlign: 'right' },
  statusBadge: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: typography.size.xs, fontWeight: '700' },
  // Phone
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  phoneInput: {
    flex: 1, fontSize: typography.size.md, color: colors.neutral.text,
    backgroundColor: colors.neutral.beige, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  phoneSaveBtn: {
    backgroundColor: colors.primary.gold, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    minWidth: 70, alignItems: 'center', justifyContent: 'center',
  },
  phoneSaveBtnDisabled: { opacity: 0.4 },
  phoneSaveBtnText: { color: colors.neutral.white, fontWeight: '700', fontSize: typography.size.sm },
  phoneHint: {
    fontSize: typography.size.xs, color: colors.neutral.textMuted,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md, textAlign: 'right',
  },
  // Notifications
  notifRow: { padding: spacing.md, gap: spacing.xs },
  notifEnabled: { fontSize: typography.size.md, fontWeight: '700', color: colors.primary.gold, textAlign: 'right' },
  notifDesc: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textAlign: 'right' },
  notifBlocked: { fontSize: typography.size.sm, color: '#EF4444', textAlign: 'right' },
  notifBtn: {
    padding: spacing.md, alignItems: 'center', backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.md, margin: spacing.sm, gap: 4,
  },
  notifBtnText: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.white },
  notifBtnSub: { fontSize: typography.size.xs, color: colors.neutral.white, opacity: 0.9 },
  // Prayer
  prayerRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  prayerEmoji: { fontSize: 22 },
  prayerLabel: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text, textAlign: 'right' },
  prayerTime: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textAlign: 'right' },
  // Kabbalot
  kabbalahInput: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
  kabbalahField: {
    flex: 1, fontSize: typography.size.sm, color: colors.neutral.text,
    padding: spacing.sm, backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.md,
  },
  kabbalahAddBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary.gold, alignItems: 'center', justifyContent: 'center',
  },
  kabbalahAddText: { color: colors.neutral.white, fontSize: 22, fontWeight: '300', lineHeight: 26 },
  kabbalahRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  kabbalahBullet: { color: colors.primary.gold, fontSize: 10 },
  kabbalahText: { flex: 1, fontSize: typography.size.sm, color: colors.neutral.text, textAlign: 'right' },
  kabbalahDelete: { color: colors.neutral.textMuted, fontSize: typography.size.sm, padding: 4 },
  // Halachic profile
  profileOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  profileOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileEmoji: { fontSize: 24 },
  profileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  prayerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.goldPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLabel: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text },
  profileSub: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2 },
  // Radio
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: colors.neutral.beigeDeep, alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary.gold },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary.gold },
  // Privacy switches
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  switchIcon: { fontSize: 22 },
  switchLabel: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text, textAlign: 'right' },
  switchDesc: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2, textAlign: 'right' },
  // Language
  langRow: { overflow: 'hidden' },
  langDivider: { height: 0.5, backgroundColor: colors.neutral.beigeDeep, marginHorizontal: spacing.md },
  langOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text },
  // Sign out
  signOutBtn: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1.5, borderColor: colors.status.alert,
    borderRadius: borderRadius.full, paddingVertical: spacing.md, alignItems: 'center',
  },
  signOutText: { color: colors.status.alert, fontSize: typography.size.md, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: typography.size.xs, color: colors.neutral.textMuted, paddingBottom: spacing.xl },
  deletionLink: { alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.md },
  deletionLinkText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textDecorationLine: 'underline' },
});
