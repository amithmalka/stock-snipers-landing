import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const WEB_ICON_MAP: Record<string, string> = {
  search: '🔍', 'map-pin': '📍', clock: '🕐', phone: '📞', navigation: '🧭', check: '✓',
};
function Icon({ name, size, color, style }: { name: string; size: number; color?: string; style?: object }) {
  if (Platform.OS === 'web') {
    return <Text style={[{ fontSize: size * 0.9, lineHeight: size * 1.3, color }, style]}>{WEB_ICON_MAP[name] ?? '•'}</Text>;
  }
  return <Icon name={name as React.ComponentProps<typeof Feather>['name']} size={size} color={color} style={style} />;
}
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { HalachicProfile } from '../../types/halachic';
import { searchMikvaot, MikvehResult } from '../../services/places/mikvehSearchService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: string;
  text: string;
  note?: string;
}

interface ChecklistSection {
  title: string;
  items: ChecklistItem[];
}


// ---------------------------------------------------------------------------
// Checklist data
// ---------------------------------------------------------------------------

const CHECKLIST_SEPHARDI: ChecklistSection[] = [
  {
    title: 'יום הטבילה (יום ז׳ — ספירה אחרונה)',
    items: [
      { id: 's1', text: 'בדיקת עד בבוקר — הבדיקה השביעית האחרונה' },
      { id: 's2', text: 'חפיפת הראש — הרטבה מלאה, שמפו, שחרור כל קשר' },
      { id: 's3', text: 'סירוק השיניים עד שאין קשרים (גם בגוף)' },
      { id: 's4', text: 'רחיצת כל הגוף במים חמים — קפלי עור, טבור, אוזניים' },
      { id: 's5', text: 'ניקוי שיניים ביסודיות + חוט דנטלי' },
      { id: 's6', text: 'הסרת שאריות איפור ומסקרה' },
      { id: 's7', text: 'גזיזת ציפורניים — ידיים ורגליים', note: 'לספרדיות מותר גם ביום הטבילה' },
      { id: 's8', text: 'הסרת תכשיטים: טבעות, צמיד, שעון, עגילים, שרשרת' },
      { id: 's9', text: 'הסרת עדשות מגע' },
      { id: 's10', text: 'לק שלם ברגליים ובידיים' },
      { id: 's11', text: 'בדיקת הגוף כולו — לאיתור חציצה שנותרה' },
    ],
  },
];

const CHECKLIST_ASHKENAZI: ChecklistSection[] = [
  {
    title: 'יום הטבילה (יום ז׳ — ספירה אחרונה)',
    items: [
      { id: 'a1', text: 'בדיקת עד בבוקר — הבדיקה השביעית האחרונה' },
      { id: 'a2', text: 'חפיפת הראש ביסודיות — שחרור כל קשר' },
      { id: 'a3', text: 'סירוק דק עד שאין קשר כלל בשיניים ובגוף', note: 'הרמ״א מחמיר בסירוק בשינייים דקות' },
      { id: 'a4', text: 'רחיצת כל הגוף במים חמים' },
      { id: 'a5', text: 'ניקוי שיניים ביסודיות + חוט דנטלי + בדיקת חניכיים' },
      { id: 'a6', text: 'הסרת שאריות איפור ומסקרה' },
      { id: 'a7', text: 'גזיזת ציפורניים — ידיים ורגליים', note: 'לפי הרמ״א — ביום שלפני הטבילה ולא ביום הטבילה עצמו' },
      { id: 'a8', text: 'ניקוי טבור ואוזניים בעיון' },
      { id: 'a9', text: 'הסרת תכשיטים: טבעות, צמיד, שעון, עגילים, שרשרת' },
      { id: 'a10', text: 'הסרת עדשות מגע' },
      { id: 'a11', text: 'לק שלם ברגליים ובידיים' },
      { id: 'a12', text: 'בדיקת הגוף כולו לאיתור חציצה' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MikvehScreenProps {
  halachicProfile?: HalachicProfile;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function MikvehScreen({ halachicProfile = 'sephardi' }: MikvehScreenProps) {
  const [activeTab, setActiveTab] = useState<'finder' | 'checklist'>('finder');
  const [cityQuery, setCityQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MikvehResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const checklist = halachicProfile === 'ashkenazi' ? CHECKLIST_ASHKENAZI : CHECKLIST_SEPHARDI;

  const handleSearch = useCallback(async () => {
    const city = cityQuery.trim();
    if (!city) return;
    setLoading(true);
    setSearchError('');
    setSearched(false);
    try {
      const data = await searchMikvaot(city);
      setResults(data);
      setSearched(true);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'שגיאה בחיפוש. נסי שוב.');
    } finally {
      setLoading(false);
    }
  }, [cityQuery]);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const totalItems = checklist.reduce((s, sec) => s + sec.items.length, 0);
  const doneCount = checked.size;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>מקווה</Text>
        <Text style={styles.subtitle}>
          {halachicProfile === 'ashkenazi' ? 'מנהג אשכנז · רמ״א' : 'מנהג ספרד · טהרת יוסף'}
        </Text>
      </View>

      {/* Tab toggle */}
      <View style={styles.tabRow}>
        {(['finder', 'checklist'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'finder' ? 'מציאת מקווה' : 'הכנות לטבילה'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'finder' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* City search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="הזיני שם עיר..."
              placeholderTextColor={colors.neutral.textMuted}
              value={cityQuery}
              onChangeText={(t) => { setCityQuery(t); setSearched(false); setResults([]); setSearchError(''); }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              textAlign="right"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.85}>
              <Icon name="search" size={18} color={colors.neutral.white} />
            </TouchableOpacity>
          </View>

          {!searched && !loading && (
            <Text style={styles.searchHint}>חפשי מקווה לפי עיר — לדוגמה: ירושלים, תל אביב, חיפה</Text>
          )}

          {loading && (
            <ActivityIndicator size="large" color={colors.primary.gold} style={{ marginTop: 40 }} />
          )}

          {searchError ? (
            <Text style={styles.noResults}>{searchError}</Text>
          ) : searched && results.length === 0 ? (
            <Text style={styles.noResults}>לא נמצאו מקוואות בעיר "{cityQuery}". נסי עיר אחרת.</Text>
          ) : null}

          {results.map((m) => (
            <View key={m.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.mikvehName}>{m.name}</Text>
              </View>

              <View style={styles.infoRow}>
                <Icon name="map-pin" size={13} color={colors.neutral.textMuted} />
                <Text style={styles.infoText}>{m.address}</Text>
              </View>
              {!!m.hours && (
                <View style={styles.infoRow}>
                  <Icon name="clock" size={13} color={colors.neutral.textMuted} />
                  <Text style={styles.infoText}>{m.hours}</Text>
                </View>
              )}

              <View style={styles.cardActions}>
                {!!m.phone && (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => Linking.openURL(`tel:${m.phone}`)}
                    activeOpacity={0.8}
                  >
                    <Icon name="phone" size={14} color={colors.primary.gold} />
                    <Text style={styles.actionBtnText}>{m.phone}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnNav]}
                  onPress={() =>
                    Linking.openURL(
                      `https://waze.com/ul?ll=${m.latitude},${m.longitude}&navigate=yes`,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Icon name="navigation" size={14} color={colors.neutral.white} />
                  <Text style={[styles.actionBtnText, { color: colors.neutral.white }]}>ניווט</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${totalItems > 0 ? (doneCount / totalItems) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{doneCount} / {totalItems} הושלמו</Text>
          </View>

          {checklist.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item) => {
                const done = checked.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.checkRow, done && styles.checkRowDone]}
                    onPress={() => toggleCheck(item.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.checkbox, done && styles.checkboxDone]}>
                      {done && <Icon name="check" size={13} color={colors.neutral.white} />}
                    </View>
                    <View style={styles.checkContent}>
                      <Text style={[styles.checkText, done && styles.checkTextDone]}>
                        {item.text}
                      </Text>
                      {item.note && (
                        <Text style={styles.checkNote}>{item.note}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {doneCount === totalItems && totalItems > 0 && (
            <View style={styles.completeBanner}>
              <Text style={styles.completeBannerText}>ברוכה הבאה! כל ההכנות הושלמו 🌊</Text>
            </View>
          )}

          <TouchableOpacity style={styles.resetBtn} onPress={() => setChecked(new Set())}>
            <Text style={styles.resetBtnText}>איפוס רשימה</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.title,
    fontWeight: '800',
    color: colors.primary.oak,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.neutral.cream,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.neutral.white },
  tabText: { fontSize: typography.size.sm, color: colors.neutral.textMuted, fontWeight: '500' },
  tabTextActive: { color: colors.neutral.text, fontWeight: '700' },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 40 },

  // Finder — city search
  searchRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: typography.size.md,
    color: colors.neutral.text,
    borderWidth: 1,
    borderColor: colors.neutral.beigeDeep,
  },
  searchBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchHint: {
    fontSize: typography.size.sm,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  noResults: {
    fontSize: typography.size.md,
    color: colors.neutral.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  // Mikveh card
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  mikvehName: {
    fontSize: typography.size.md,
    fontWeight: '700',
    color: colors.neutral.text,
    flex: 1,
    textAlign: 'right',
  },
  cityBadge: {
    backgroundColor: colors.primary.goldPale,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  cityBadgeText: { fontSize: typography.size.xs, color: colors.primary.oak, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: { fontSize: typography.size.sm, color: colors.neutral.textLight, textAlign: 'right' },
  cardActions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.primary.gold,
    borderRadius: borderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
  },
  actionBtnNav: {
    backgroundColor: colors.primary.gold,
    borderColor: colors.primary.gold,
  },
  actionBtnText: { fontSize: typography.size.sm, color: colors.primary.gold, fontWeight: '600' },

  // Checklist
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral.beigeDeep,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.gold,
    borderRadius: 3,
  },
  progressText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, width: 70, textAlign: 'right' },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.size.sm,
    fontWeight: '700',
    color: colors.primary.oak,
    textAlign: 'right',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.beigeDeep,
  },
  checkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  checkRowDone: { backgroundColor: colors.neutral.cream },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.neutral.beigeDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: colors.primary.gold, borderColor: colors.primary.gold },
  checkContent: { flex: 1, alignItems: 'flex-end' },
  checkText: {
    fontSize: typography.size.md,
    color: colors.neutral.text,
    textAlign: 'right',
    lineHeight: 22,
  },
  checkTextDone: { color: colors.neutral.textMuted, textDecorationLine: 'line-through' },
  checkNote: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  completeBanner: {
    backgroundColor: colors.calendar.mikveh,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  completeBannerText: { color: colors.neutral.white, fontWeight: '700', fontSize: typography.size.md },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  resetBtnText: { fontSize: typography.size.sm, color: colors.neutral.textMuted },
});
