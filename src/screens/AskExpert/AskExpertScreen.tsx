import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { supabase } from '../../config/supabase';

interface DayHours {
  start: string;
  end: string;
}

type AvailableHours = Record<string, DayHours | null>;

interface Rabbi {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  city: string | null;
  available_hours: AvailableHours | null;
  notes: string | null;
  is_available: boolean;
}

const DAYS_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function isAvailableNow(hours: AvailableHours | null | undefined): boolean {
  if (!hours) return false;
  const now = new Date();
  const dow = String(now.getDay());
  const day = hours[dow];
  if (!day || !day.start || !day.end) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = day.start.split(':').map(Number);
  const [eh, em] = day.end.split(':').map(Number);
  return cur >= sh * 60 + sm && cur <= eh * 60 + em;
}

function summarizeHours(h: AvailableHours | null | undefined): string {
  if (!h) return '';
  const parts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = h[String(i)];
    if (d && d.start && d.end) parts.push(`${DAYS_HE[i]} ${d.start}-${d.end}`);
  }
  return parts.join(' · ');
}

function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

const RABBIS_CACHE_KEY = 'siel.rabbis.cache.v1';

function loadCachedRabbis(): Rabbi[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(RABBIS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveCachedRabbis(rabbis: Rabbi[]) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(RABBIS_CACHE_KEY, JSON.stringify(rabbis));
  } catch {}
}

export default function AskExpertScreen() {
  const initialRabbis = loadCachedRabbis();
  const [rabbis, setRabbis] = useState<Rabbi[]>(initialRabbis);
  const [loading, setLoading] = useState(initialRabbis.length === 0);
  const [query, setQuery] = useState('');
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [, setNowTick] = useState(0);

  // Re-render every minute so isAvailableNow updates as time passes
  useEffect(() => {
    const t = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const loadRabbis = useCallback(async () => {
    setLoading(true);
    const safety = setTimeout(() => setLoading(false), 10000);

    // PRIMARY: backoffice API (server-side service_role — bypasses RLS / CORS / session issues)
    try {
      const res = await fetch(`/api/public-rabbis?_t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.rabbis) && json.rabbis.length > 0) {
          setRabbis(json.rabbis as Rabbi[]);
          saveCachedRabbis(json.rabbis as Rabbi[]);
          clearTimeout(safety);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('[AskExpert] API failed, falling back to direct Supabase:', e);
    }

    // FALLBACK: direct Supabase
    try {
      const { data } = await supabase
        .from('rabbis')
        .select('id, name, specialty, phone, city, available_hours, notes, is_available')
        .eq('is_available', true)
        .order('name');
      if (data && data.length > 0) {
        setRabbis(data);
        saveCachedRabbis(data);
      }
    } catch (e) {
      console.error('[AskExpert] load rabbis failed:', e);
    } finally {
      clearTimeout(safety);
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadRabbis(); }, [loadRabbis]));

  function callRabbi(phone: string) {
    Linking.openURL(`tel:${sanitizePhone(phone)}`).catch(() => {});
  }

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const r of rabbis) {
      if (r.city && r.city.trim()) set.add(r.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
  }, [rabbis]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rabbis.filter((r) => {
      if (activeCity && r.city !== activeCity) return false;
      if (!q) return true;
      const hay = [r.name, r.city, r.notes, r.specialty].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rabbis, query, activeCity]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.appName}>SIEL</Text>
        <Text style={styles.title}>שאלי רב</Text>
        <Text style={styles.subtitle}>
          רבנים מוסמכים זמינים לענות לשאלות שלך — לחיצה על כפתור הטלפון תפתח שיחה ישירות.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary.gold} style={{ marginTop: spacing.xl }} />
        ) : rabbis.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Feather name="user-check" size={28} color={colors.primary.rose} />
            </View>
            <Text style={styles.emptyTitle}>בקרוב</Text>
            <Text style={styles.emptyDesc}>
              אנחנו בתהליך גיוס רבנים מוסמכים שייתנו לך מענה אישי. הרשימה תיפתח בקרוב.
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="חיפוש לפי שם או עיר…"
              placeholderTextColor={colors.neutral.textMuted}
              value={query}
              onChangeText={setQuery}
              textAlign="right"
            />

            {cities.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cityRow}
              >
                <TouchableOpacity
                  style={[styles.cityChip, !activeCity && styles.cityChipActive]}
                  onPress={() => setActiveCity(null)}
                >
                  <Text style={[styles.cityChipText, !activeCity && styles.cityChipTextActive]}>הכל</Text>
                </TouchableOpacity>
                {cities.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityChip, activeCity === c && styles.cityChipActive]}
                    onPress={() => setActiveCity(activeCity === c ? null : c)}
                  >
                    <Text style={[styles.cityChipText, activeCity === c && styles.cityChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Text style={styles.count}>
              {filtered.length === rabbis.length
                ? `${rabbis.length} רבנים`
                : `${filtered.length} מתוך ${rabbis.length} רבנים`}
            </Text>

            {filtered.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyDesc}>לא נמצאו רבנים התואמים לחיפוש</Text>
              </View>
            ) : (
              <View style={styles.list}>
                {filtered.map((r) => {
              const availableNow = isAvailableNow(r.available_hours);
              const hoursText = summarizeHours(r.available_hours);
              return (
                <View key={r.id} style={styles.card}>
                  <View style={styles.nameRow}>
                    <Text style={styles.rabbiName}>{r.name}</Text>
                    {r.specialty && (
                      <View style={styles.specialtyBadge}>
                        <Text style={styles.specialtyText}>
                          {r.specialty === 'sephardi' ? 'ספרדי' : r.specialty === 'ashkenazi' ? 'אשכנזי' : r.specialty}
                        </Text>
                      </View>
                    )}
                  </View>
                  {r.city && (
                    <View style={styles.cityInline}>
                      <Feather name="map-pin" size={12} color={colors.primary.gold} />
                      <Text style={styles.cityText}>{r.city}</Text>
                    </View>
                  )}
                  <View style={[styles.statusPill, availableNow ? styles.statusOnline : styles.statusOffline]}>
                    <View style={[styles.statusDot, availableNow ? styles.statusDotOnline : styles.statusDotOffline]} />
                    <Text style={[styles.statusText, availableNow ? styles.statusTextOnline : styles.statusTextOffline]}>
                      {availableNow ? 'זמין כעת' : 'לא זמין כעת'}
                    </Text>
                  </View>

                  {hoursText.length > 0 && (
                    <Text style={styles.hours} numberOfLines={2}>{hoursText}</Text>
                  )}

                  {r.notes && <Text style={styles.notes}>{r.notes}</Text>}

                  {r.phone && (
                    <TouchableOpacity
                      style={[styles.callBtn, !availableNow && styles.callBtnMuted]}
                      onPress={() => callRabbi(r.phone!)}
                      activeOpacity={0.85}
                    >
                      <Feather name="phone" size={18} color={availableNow ? colors.neutral.white : colors.neutral.textMuted} />
                      <Text style={availableNow ? styles.callBtnText : styles.callBtnTextMuted}>
                        {availableNow ? `התקשרי ${r.phone}` : 'התקשרי בשעות הזמינות'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
                })}
              </View>
            )}
          </>
        )}

        <Text style={styles.privacy}>
          🔒 השיחות מתבצעות ישירות בינך לבין הרב. SIEL לא מאזינה ולא שומרת תוכן השיחה.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.cream },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 0, flexGrow: 1 },
  appName: { fontSize: 22, fontWeight: '800', color: colors.primary.gold, letterSpacing: 4, textAlign: 'center', marginBottom: 2 },
  title: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: spacing.md, paddingHorizontal: spacing.sm },
  searchInput: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    color: colors.neutral.text,
    borderWidth: 1,
    borderColor: colors.neutral.beigeDeep,
    marginBottom: spacing.sm,
  },
  cityRow: { paddingBottom: spacing.sm, gap: spacing.xs, flexDirection: 'row-reverse' },
  cityChip: {
    backgroundColor: colors.neutral.white,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.neutral.beigeDeep,
    marginHorizontal: 4,
  },
  cityChipActive: { backgroundColor: colors.primary.gold, borderColor: colors.primary.gold },
  cityChipText: { fontSize: typography.size.xs, color: colors.neutral.text, fontWeight: '600' },
  cityChipTextActive: { color: colors.neutral.white },
  count: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginBottom: spacing.sm, textAlign: 'right' },
  cityInline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs, justifyContent: 'flex-end' },
  cityText: { fontSize: typography.size.sm, color: colors.primary.gold, fontWeight: '600' },
  list: { gap: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.lg,
    marginHorizontal: 4,
    shadowColor: '#A87872',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginBottom: 6 },
  rabbiName: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text },
  specialtyBadge: { backgroundColor: colors.neutral.beige, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  specialtyText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, fontWeight: '600' },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 2, marginBottom: spacing.sm },
  statusOnline: { backgroundColor: '#DCF5DC' },
  statusOffline: { backgroundColor: '#F0EDE9' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotOnline: { backgroundColor: '#3DAA3D' },
  statusDotOffline: { backgroundColor: colors.neutral.textMuted },
  statusText: { fontSize: typography.size.xs, fontWeight: '600' },
  statusTextOnline: { color: '#1F7A1F' },
  statusTextOffline: { color: colors.neutral.textMuted },
  hours: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textAlign: 'right', marginBottom: 6, lineHeight: 18 },
  notes: { fontSize: typography.size.sm, color: colors.neutral.textMuted, paddingTop: 4, paddingBottom: 8, textAlign: 'right', lineHeight: 20 },
  callBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary.gold, borderRadius: 14, paddingVertical: 14, gap: spacing.sm, marginTop: spacing.sm },
  callBtnMuted: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.neutral.beigeDeep },
  callIcon: { fontSize: 18 },
  callBtnText: { color: colors.neutral.white, fontWeight: '700', fontSize: typography.size.md },
  callBtnTextMuted: { color: colors.neutral.textMuted, fontWeight: '600', fontSize: typography.size.md },
  emptyCard: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.xl, alignItems: 'center', marginTop: spacing.xl },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.rosePale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: typography.size.xl, fontWeight: '800', color: colors.neutral.text, marginBottom: spacing.sm },
  emptyDesc: { fontSize: typography.size.sm, color: colors.neutral.textMuted, textAlign: 'center', lineHeight: 20 },
  privacy: { fontSize: typography.size.xs, color: colors.neutral.textMuted, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.md, lineHeight: 18 },
});
