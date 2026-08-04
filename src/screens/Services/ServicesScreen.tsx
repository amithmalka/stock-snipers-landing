import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Linking, Alert, Modal, Platform, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { ServiceProvider } from '../../types/models';
import { searchProviders, fetchProviderServices, ProviderService } from '../../services/supabase/servicesService';
import { fetchSlotsForDateDetailed, createAppointment, TimeSlot, SlotsResult } from '../../services/supabase/bookingService';
import { isSupabaseConfigured } from '../../config/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';

function Icon({ name, size, color, style }: { name: string; size: number; color?: string; style?: object }) {
  return <Feather name={name as React.ComponentProps<typeof Feather>['name']} size={size} color={color} style={style} />;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nextDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return d.toISOString().substring(0, 10);
  });
}

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  const day = d.toLocaleDateString(locale, { weekday: 'short' });
  const num = d.getDate();
  const mon = d.toLocaleDateString(locale, { month: 'short' });
  return { day, num, mon };
}

const CATEGORIES = [
  { label: 'הכל', value: null },
  { label: 'ציפורניים גל', value: 'ציפורניים גל' },
  { label: 'פדיקור', value: 'פדיקור' },
  { label: 'הסרת שיער', value: 'הסרת שיער' },
  { label: 'גבות', value: 'גבות' },
  { label: 'טיפול פנים', value: 'טיפול פנים' },
  { label: 'איפור', value: 'איפור' },
  { label: 'עיסוי', value: 'עיסוי' },
];


function BookingSheet({ provider, onClose }: { provider: ServiceProvider; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const { user, updateProfile } = useAuth();
  const locale = lang === 'he' ? 'he-IL' : 'en-US';
  const days = nextDays(14);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<ProviderService | null>(null);
  const [selectedDate, setSelectedDate] = useState(days[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsReason, setSlotsReason] = useState<SlotsResult['reason']>('ok');
  const [slotsErrorDetail, setSlotsErrorDetail] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);
  const [showPhoneGate, setShowPhoneGate] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);

  useEffect(() => {
    fetchProviderServices(provider.id)
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));
  }, [provider.id]);

  useEffect(() => {
    if (!selectedService) return;
    let cancelled = false;
    setSelectedSlot(null);
    setLoadingSlots(true);
    // Hard safety: never let spinner spin more than 7s. fetchSlots now
    // races API + Supabase in parallel with 5.5s hard ceiling on each.
    const safety = setTimeout(() => {
      if (cancelled) return;
      setLoadingSlots(false);
      setSlots([]);
      setSlotsReason('error');
      setSlotsErrorDetail('safety-timeout-7s');
    }, 7000);
    fetchSlotsForDateDetailed(provider.id, selectedDate, selectedService.duration_minutes)
      .then((r) => {
        if (cancelled) return;
        setSlots(r.slots);
        setSlotsReason(r.reason);
        setSlotsErrorDetail(r.errorDetail ?? '');
      })
      .catch((e) => {
        if (cancelled) return;
        setSlots([]);
        setSlotsReason('error');
        setSlotsErrorDetail(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        clearTimeout(safety);
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, [selectedDate, provider.id, selectedService]);

  async function performBooking() {
    if (!selectedSlot || !selectedService) return;
    setBooking(true);
    try {
      await createAppointment(provider.id, selectedDate, selectedSlot, '', selectedService.name, selectedService.price);
      setDone(true);
    } catch (e: unknown) {
      Alert.alert(t.error, e instanceof Error ? e.message : t.tryAgain);
    } finally {
      setBooking(false);
    }
  }

  function confirmBooking() {
    if (!selectedSlot || !selectedService) return;
    if (!user?.phone || user.phone.trim().length < 9) {
      setPhoneInput(user?.phone ?? '');
      setShowPhoneGate(true);
      return;
    }
    performBooking();
  }

  async function handleSavePhoneAndBook() {
    const clean = phoneInput.trim();
    if (clean.replace(/[^0-9]/g, '').length < 9) {
      Alert.alert(t.error, t.invalidPhone);
      return;
    }
    setPhoneSaving(true);
    try {
      await updateProfile({ phone: clean });
      setShowPhoneGate(false);
      await performBooking();
    } catch (e: unknown) {
      Alert.alert(t.error, e instanceof Error ? e.message : t.tryAgain);
    } finally {
      setPhoneSaving(false);
    }
  }

  return (
    <View style={bookStyles.container}>
      <View style={bookStyles.handle} />
      <Text style={bookStyles.title}>{t.bookAppointment} — {provider.name}</Text>

      {done ? (
        <View style={bookStyles.doneBox}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>✅</Text>
          <Text style={bookStyles.doneText}>{t.requestSent}</Text>
          <Text style={bookStyles.doneSub}>{t.providerWillConfirm}</Text>
          <TouchableOpacity style={bookStyles.closeBtn} onPress={onClose}>
            <Text style={bookStyles.closeBtnText}>{t.close}</Text>
          </TouchableOpacity>
        </View>
      ) : !selectedService ? (
        <>
          <Text style={bookStyles.sectionLabel}>בחרי שירות</Text>
          {loadingServices ? (
            <ActivityIndicator color={colors.primary.rose} style={{ marginVertical: 16 }} />
          ) : services.length === 0 ? (
            <Text style={bookStyles.noSlots}>אין שירותים זמינים כרגע</Text>
          ) : (
            <View style={{ gap: 8, marginBottom: 16 }}>
              {services.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSelectedService(s)}
                  style={bookStyles.serviceChip}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={bookStyles.serviceName}>{s.name}</Text>
                    <Text style={bookStyles.serviceMeta}>{s.duration_minutes} דקות</Text>
                  </View>
                  <Text style={bookStyles.servicePrice}>₪{s.price}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity style={bookStyles.cancelLink} onPress={onClose}>
            <Text style={bookStyles.cancelText}>{t.cancel}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity onPress={() => setSelectedService(null)} style={bookStyles.selectedServiceBar}>
            <Text style={bookStyles.selectedServiceText}>{selectedService.name} · ₪{selectedService.price}</Text>
            <Text style={bookStyles.changeText}>שינוי</Text>
          </TouchableOpacity>

          <Text style={bookStyles.sectionLabel}>{t.chooseDay}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={bookStyles.daysScroll}>
            {days.map((d) => {
              const { day, num, mon } = formatDate(d, locale);
              const sel = d === selectedDate;
              return (
                <TouchableOpacity key={d} style={[bookStyles.dayChip, sel && bookStyles.dayChipSel]} onPress={() => setSelectedDate(d)}>
                  <Text style={[bookStyles.dayName, sel && bookStyles.dayTextSel]}>{day}</Text>
                  <Text style={[bookStyles.dayNum, sel && bookStyles.dayTextSel]}>{num}</Text>
                  <Text style={[bookStyles.dayMon, sel && bookStyles.dayTextSel]}>{mon}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={bookStyles.sectionLabel}>{t.availableTimes}</Text>
          {loadingSlots ? (
            <ActivityIndicator color={colors.primary.rose} style={{ marginVertical: 16 }} />
          ) : slots.length === 0 ? (
            <Text style={bookStyles.noSlots}>
              {slotsReason === 'no_hours_at_all'
                ? 'בעלת העסק עדיין לא הגדירה שעות זמינות. נסי לפנות אליה ישירות.'
                : slotsReason === 'no_hours_this_day'
                  ? 'אין שעות זמינות ביום זה. נסי יום אחר.'
                  : slotsReason === 'date_blocked'
                    ? 'התאריך הזה חסום (חופשה / חג). נסי תאריך אחר.'
                    : slotsReason === 'error'
                      ? `הטעינה לוקחת זמן רב. בדקי חיבור לאינטרנט ונסי שוב.\n(${slotsErrorDetail || 'unknown'})`
                      : t.noAvailability}
            </Text>
          ) : (() => {
              const available = slots.filter((s) => !s.booked);
              const bookedCount = slots.length - available.length;
              if (available.length === 0) {
                return (
                  <Text style={bookStyles.noSlots}>
                    כל השעות ביום זה כבר תפוסות ({bookedCount}). נסי יום אחר.
                  </Text>
                );
              }
              const morning = available.filter((s) => Number(s.start.slice(0, 2)) < 12);
              const afternoon = available.filter((s) => {
                const h = Number(s.start.slice(0, 2));
                return h >= 12 && h < 17;
              });
              const evening = available.filter((s) => Number(s.start.slice(0, 2)) >= 17);
              const groups: { label: string; items: TimeSlot[] }[] = [];
              if (morning.length) groups.push({ label: 'בוקר', items: morning });
              if (afternoon.length) groups.push({ label: 'צהריים', items: afternoon });
              if (evening.length) groups.push({ label: 'ערב', items: evening });
              return (
                <View>
                  {groups.map((g) => (
                    <View key={g.label} style={{ marginBottom: spacing.md }}>
                      <Text style={bookStyles.slotsGroupLabel}>{g.label}</Text>
                      <View style={bookStyles.slotsGrid}>
                        {g.items.map((s) => {
                          const sel = selectedSlot?.start === s.start;
                          return (
                            <TouchableOpacity
                              key={s.start}
                              onPress={() => setSelectedSlot(s)}
                              style={[bookStyles.slotChip, sel && bookStyles.slotSel]}
                            >
                              <Text style={[bookStyles.slotText, sel && bookStyles.slotSelText]}>
                                {s.start}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                  {bookedCount > 0 && (
                    <Text style={bookStyles.bookedNote}>
                      {bookedCount} שעות נוספות כבר תפוסות
                    </Text>
                  )}
                </View>
              );
            })()
          }

          <TouchableOpacity
            style={[bookStyles.confirmBtn, (!selectedSlot || booking) && bookStyles.confirmBtnDisabled]}
            disabled={!selectedSlot || booking}
            onPress={confirmBooking}
          >
            <Text style={bookStyles.confirmText}>
              {booking ? t.sending : selectedSlot ? `${t.confirmSlot} ${selectedSlot.start}` : t.chooseTime}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={bookStyles.cancelLink} onPress={onClose}>
            <Text style={bookStyles.cancelText}>{t.cancel}</Text>
          </TouchableOpacity>
        </>
      )}

      <Modal
        visible={showPhoneGate}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhoneGate(false)}
      >
        <View style={bookStyles.modalOverlay}>
          <View style={bookStyles.phoneGateCard}>
            <Text style={bookStyles.phoneGateTitle}>{t.phoneRequiredTitle}</Text>
            <Text style={bookStyles.phoneGateDesc}>{t.phoneRequiredDesc}</Text>
            <TextInput
              style={bookStyles.phoneGateInput}
              placeholder="050-1234567"
              placeholderTextColor={colors.neutral.textMuted}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              textAlign="left"
              maxLength={15}
              autoFocus
            />
            <TouchableOpacity
              style={bookStyles.phoneGateBtn}
              onPress={handleSavePhoneAndBook}
              disabled={phoneSaving}
              activeOpacity={0.85}
            >
              {phoneSaving ? (
                <ActivityIndicator color={colors.neutral.white} />
              ) : (
                <Text style={bookStyles.phoneGateBtnText}>{t.savePhoneAndBook}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowPhoneGate(false)}>
              <Text style={bookStyles.phoneGateCancel}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProviderDetailModal({ provider, onClose }: { provider: ServiceProvider | null; onClose: () => void }) {
  const { t } = useLanguage();
  const [showBooking, setShowBooking] = useState(false);

  if (!provider) return null;

  function callProvider() {
    const url = `tel:${provider!.phone}`;
    Linking.canOpenURL(url).then((ok) => {
      if (ok) Linking.openURL(url);
      else Alert.alert(t.error, t.errorCannotCall);
    });
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={detailStyles.overlay}>
        <ScrollView style={detailStyles.sheet} showsVerticalScrollIndicator={false}>
          <View style={detailStyles.handle} />

          <View style={detailStyles.profileHeader}>
            <View style={detailStyles.avatar}>
              {provider.profileImageUrl ? (
                <Image source={{ uri: provider.profileImageUrl }} style={detailStyles.avatarImg} />
              ) : (
                <Text style={{ fontSize: 28 }}>👤</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={detailStyles.name}>{provider.name}</Text>
              {provider.specialty && <Text style={detailStyles.specialty}>{provider.specialty}</Text>}
              <View style={detailStyles.metaRow}>
                {provider.city && (
                  <View style={detailStyles.metaItem}>
                    <Icon name="map-pin" size={13} color={colors.primary.rose} />
                    <Text style={detailStyles.metaText}>{provider.city}</Text>
                  </View>
                )}
                {provider.address && (
                  <View style={detailStyles.metaItem}>
                    <Icon name="home" size={13} color={colors.primary.rose} />
                    <Text style={detailStyles.metaText}>{provider.address}</Text>
                  </View>
                )}
                {provider.distanceKm !== undefined && (
                  <View style={detailStyles.metaItem}>
                    <Icon name="navigation" size={13} color={colors.primary.rose} />
                    <Text style={detailStyles.metaText}>{provider.distanceKm.toFixed(1)} ק״מ</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {provider.bio ? <Text style={detailStyles.bio}>{provider.bio}</Text> : null}

          {provider.portfolioImages.length > 0 && (
            <>
              <Text style={detailStyles.sectionLabel}>{t.workGallery}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                {provider.portfolioImages.map((url, i) => (
                  <Image key={i} source={{ uri: url }} style={detailStyles.galleryImg} />
                ))}
              </ScrollView>
            </>
          )}

          {!showBooking ? (
            <TouchableOpacity style={detailStyles.bookBtn} onPress={() => setShowBooking(true)}>
              <Icon name="calendar" size={16} color={colors.neutral.white} style={{ marginRight: 6 }} />
              <Text style={detailStyles.bookText}>{t.bookAppointment}</Text>
            </TouchableOpacity>
          ) : (
            <BookingSheet provider={provider} onClose={() => { setShowBooking(false); onClose(); }} />
          )}

          {!showBooking && (
            <>
              <TouchableOpacity style={detailStyles.callBtn} onPress={callProvider}>
                <Icon name="phone" size={16} color={colors.primary.rose} style={{ marginRight: 6 }} />
                <Text style={detailStyles.callText}>{t.callProvider}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose}>
                <Text style={detailStyles.closeBtnText}>{t.close}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function ServicesScreen() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const PROVIDERS_CACHE_KEY = 'siel.providers.cache';
  const cachedProviders: ServiceProvider[] = (() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = window.localStorage.getItem(PROVIDERS_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();
  const [providers, setProviders] = useState<ServiceProvider[]>(cachedProviders);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({}).then(({ coords }) => {
        setUserLocation({ lat: coords.latitude, lon: coords.longitude });
      });
    });
  }, []);

  const runSearch = useCallback(async (q: string, cat: string | null, loc: typeof userLocation) => {
    if (!isSupabaseConfigured) return;
    // Only show spinner if we have NO cached providers — otherwise update
    // silently in background.
    if (providers.length === 0) setIsLoading(true);
    const safety = setTimeout(() => setIsLoading(false), 7000);
    try {
      // Search the typed text if there is any, otherwise the selected category
      // (its label is a service type). They must NOT be concatenated — a joined
      // string like "בת ים גבות" matches neither a city nor a service.
      const term = q.trim() || (cat ?? '');
      const results = await searchProviders(term);
      const withDistance = results.map((p) => ({
        ...p,
        distanceKm: loc && p.latitude !== 0 ? haversineKm(loc.lat, loc.lon, p.latitude, p.longitude) : undefined,
      }));
      if (loc) withDistance.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
      if (withDistance.length > 0) {
        setProviders(withDistance);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(PROVIDERS_CACHE_KEY, JSON.stringify(withDistance));
          }
        } catch {}
      } else if (q || cat) {
        // empty search results — only reflect this for filtered queries
        setProviders([]);
      }
    } catch { } finally {
      clearTimeout(safety);
      setIsLoading(false);
    }
  }, [providers.length]);

  useEffect(() => { runSearch(searchQuery, selectedCategory, userLocation); }, [userLocation]); // eslint-disable-line
  useEffect(() => {
    const t2 = setTimeout(() => runSearch(searchQuery, selectedCategory, userLocation), 400);
    return () => clearTimeout(t2);
  }, [searchQuery, selectedCategory]); // eslint-disable-line

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.servicesTitle}</Text>
        <Text style={styles.subtitle}>{t.servicesSubtitle}</Text>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={16} color={colors.neutral.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.neutral.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          textAlign="right"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={16} color={colors.neutral.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.value;
          return (
            <TouchableOpacity
              key={cat.label}
              onPress={() => setSelectedCategory(cat.value)}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={selectedCategory ? providers.filter((p) => p.specialty === selectedCategory || p.category === selectedCategory) : providers}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading
            ? <ActivityIndicator color={colors.primary.gold} style={{ marginTop: spacing.xl }} />
            : <Text style={styles.empty}>{searchQuery.length > 0 ? `אין שירותים זמינים ב${searchQuery}` : t.noResults}</Text>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.proCta}
            onPress={() => Linking.openURL('https://siel-backoffice.vercel.app/login?signup=1')}
            activeOpacity={0.7}
          >
            <Text style={styles.proCtaText}>
              גם את בתחום היופי?
              <Text style={styles.proCtaLink}> הירשמי כבעלת עסק ←</Text>
            </Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedProvider(item)} activeOpacity={0.8}>
            <View style={styles.cardAvatar}>
              {item.profileImageUrl
                ? <Image source={{ uri: item.profileImageUrl }} style={styles.cardAvatarImg} />
                : <Icon name="heart" size={22} color={colors.primary.rose} />}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardCategory}>{item.specialty || item.category}</Text>
              {item.city && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Icon name="map-pin" size={11} color={colors.neutral.textMuted} />
                  <Text style={styles.cardCity}>{item.city}</Text>
                </View>
              )}
            </View>
            {item.distanceKm !== undefined
              ? <Text style={styles.cardDist}>{item.distanceKm.toFixed(1)} ק״מ</Text>
              : <Icon name="chevron-left" size={18} color={colors.neutral.sand} />}
          </TouchableOpacity>
        )}
      />

      <ProviderDetailModal provider={selectedProvider} onClose={() => setSelectedProvider(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.cream },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.neutral.text },
  subtitle: { fontSize: typography.size.sm, color: colors.neutral.textLight, marginTop: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg, marginHorizontal: spacing.lg, paddingHorizontal: spacing.md,
    gap: spacing.sm, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: typography.size.md, color: colors.neutral.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: spacing.md, gap: spacing.md,
    shadowColor: '#A87872', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  cardAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary.rosePale, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardAvatarImg: { width: 50, height: 50, borderRadius: 25 },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.text },
  cardCategory: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  cardCity: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  cardDist: { fontSize: typography.size.xs, color: colors.neutral.textMuted, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.neutral.textMuted, padding: spacing.xl },
  proCta: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  proCtaText: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    textAlign: 'center',
  },
  proCtaLink: {
    color: colors.primary.rose,
    fontWeight: '600',
  },
  categoryScroll: { flexGrow: 0, marginBottom: spacing.sm },
  categoryContent: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.neutral.white, borderWidth: 1, borderColor: colors.neutral.beigeDeep,
  },
  categoryChipActive: { backgroundColor: colors.primary.rose, borderColor: colors.primary.rose },
  categoryChipText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, fontWeight: '600' },
  categoryChipTextActive: { color: colors.neutral.white },
});

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.neutral.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral.beigeDeep, alignSelf: 'center', marginBottom: spacing.lg },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.neutral.beige, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  name: { fontSize: typography.size.lg, fontWeight: '800', color: colors.neutral.text, marginBottom: 2 },
  specialty: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginBottom: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: typography.size.xs, color: colors.neutral.textLight },
  bio: { fontSize: typography.size.sm, color: colors.neutral.textLight, lineHeight: 20, backgroundColor: colors.neutral.beige, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md },
  sectionLabel: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral.textMuted, marginBottom: spacing.sm },
  galleryImg: { width: 100, height: 100, borderRadius: 12, marginRight: spacing.sm },
  bookBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary.rose, borderRadius: borderRadius.full, paddingVertical: spacing.md, marginBottom: spacing.sm },
  bookText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
  callBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.neutral.beige, borderRadius: borderRadius.full, paddingVertical: spacing.md, marginBottom: spacing.sm },
  callText: { color: colors.neutral.text, fontSize: typography.size.md, fontWeight: '600' },
  closeBtn: { alignItems: 'center', paddingVertical: spacing.sm, marginBottom: spacing.md },
  closeBtnText: { color: colors.neutral.textMuted, fontSize: typography.size.md },
});

const bookStyles = StyleSheet.create({
  container: { paddingTop: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral.beigeDeep, alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text, textAlign: 'center', marginBottom: spacing.md },
  sectionLabel: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral.textMuted, marginBottom: spacing.sm },
  daysScroll: { marginBottom: spacing.md },
  dayChip: { width: 52, paddingVertical: 10, borderRadius: 14, backgroundColor: colors.neutral.white, alignItems: 'center', marginRight: spacing.sm, borderWidth: 1, borderColor: colors.neutral.beige },
  dayChipSel: { backgroundColor: colors.primary.rose, borderColor: colors.primary.rose },
  dayName: { fontSize: 10, color: colors.neutral.textMuted },
  dayNum: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text, lineHeight: 24 },
  dayMon: { fontSize: 10, color: colors.neutral.textMuted },
  dayTextSel: { color: colors.neutral.white },
  noSlots: { color: colors.neutral.textMuted, textAlign: 'center', paddingVertical: spacing.lg, fontSize: typography.size.sm },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotsGroupLabel: { fontSize: typography.size.sm, fontWeight: '700', color: colors.neutral.text, marginBottom: spacing.sm },
  bookedNote: { fontSize: 11, color: colors.neutral.textMuted, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
  slotChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.neutral.white, borderWidth: 1.5, borderColor: colors.primary.rose, minWidth: 70, alignItems: 'center' },
  slotBooked: { backgroundColor: colors.neutral.beige, borderColor: colors.neutral.beige },
  slotSel: { backgroundColor: colors.primary.rose, borderColor: colors.primary.rose },
  slotText: { fontSize: typography.size.sm, color: colors.neutral.text, fontWeight: '600' },
  slotBookedText: { color: colors.neutral.textMuted, textDecorationLine: 'line-through' },
  slotSelText: { color: colors.neutral.white },
  noteBox: { marginBottom: spacing.md },
  noteInput: { borderWidth: 1, borderColor: colors.neutral.beige, borderRadius: 12, padding: spacing.md, fontSize: typography.size.sm, color: colors.neutral.text, backgroundColor: colors.neutral.white },
  confirmBtn: { backgroundColor: colors.primary.rose, borderRadius: borderRadius.full, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmText: { color: colors.neutral.white, fontWeight: '700', fontSize: typography.size.md },
  cancelLink: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.neutral.textMuted, fontSize: typography.size.sm },
  serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.neutral.beige },
  serviceName: { fontSize: typography.size.md, fontWeight: '600', color: colors.neutral.text },
  serviceMeta: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 2 },
  servicePrice: { fontSize: typography.size.lg, fontWeight: '700', color: colors.primary.rose },
  selectedServiceBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary.rosePale, borderRadius: 12, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.md },
  selectedServiceText: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral.text },
  changeText: { fontSize: typography.size.xs, color: colors.primary.rose, fontWeight: '600' },
  doneBox: { alignItems: 'center', paddingVertical: spacing.xl },
  doneText: { fontSize: typography.size.xl, fontWeight: '800', color: colors.neutral.text, marginBottom: 4 },
  doneSub: { fontSize: typography.size.sm, color: colors.neutral.textMuted, marginBottom: spacing.xl },
  closeBtn: { backgroundColor: colors.primary.rose, borderRadius: borderRadius.full, paddingHorizontal: 32, paddingVertical: spacing.md },
  closeBtnText: { color: colors.neutral.white, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  phoneGateCard: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.xl, width: '100%', maxWidth: 380, alignItems: 'stretch' },
  phoneGateTitle: { fontSize: typography.size.lg, fontWeight: '800', color: colors.neutral.text, textAlign: 'right', marginBottom: spacing.xs },
  phoneGateDesc: { fontSize: typography.size.sm, color: colors.neutral.textMuted, textAlign: 'right', marginBottom: spacing.lg, lineHeight: 20 },
  phoneGateInput: {
    fontSize: typography.size.md, color: colors.neutral.text,
    backgroundColor: colors.neutral.beige, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  phoneGateBtn: {
    backgroundColor: colors.primary.gold, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  phoneGateBtnText: { color: colors.neutral.white, fontWeight: '700', fontSize: typography.size.md },
  phoneGateCancel: { textAlign: 'center', color: colors.neutral.textMuted, fontSize: typography.size.sm, paddingVertical: spacing.sm },
});
