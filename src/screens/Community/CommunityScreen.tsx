import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { ForumPost } from '../../types/models';
import { passesModeration, sanitizeInput } from '../../utils/moderation';

const CATEGORIES = ['כללי', 'שאלות הלכה', 'תמיכה', 'שמחות', 'טיפים'];

const DEMO_POSTS: ForumPost[] = [
  { id: '1', anonymousHandle: 'פרח_זהב', title: 'שאלה על ספירת שבעה נקיים', content: 'שלום לכולן, האם מישהי יכולה להסביר...', category: 'שאלות הלכה', createdAt: new Date(Date.now() - 3600000).toISOString(), replyCount: 5 },
  { id: '2', anonymousHandle: 'ירח_כסף', title: 'מסיבת טבילה — רעיונות?', content: 'אני מחפשת רעיונות יצירתיים לחגוג...', category: 'שמחות', createdAt: new Date(Date.now() - 7200000).toISOString(), replyCount: 12 },
  { id: '3', anonymousHandle: 'כוכב_בוקר', title: 'המלצה על מניקוריסטית בירושלים', content: 'מחפשת מניקוריסטית שמכירה את הכללים...', category: 'טיפים', createdAt: new Date(Date.now() - 86400000).toISOString(), replyCount: 3 },
  { id: '4', anonymousHandle: 'שמש_זהב', title: 'קשה לי עם הוסתות הלא סדירים', content: 'רציתי לשתף שהשנה הייתה קשה...', category: 'תמיכה', createdAt: new Date(Date.now() - 172800000).toISOString(), replyCount: 8 },
];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
}

interface NewPostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (post: Omit<ForumPost, 'id' | 'createdAt' | 'replyCount'>) => void;
}

function NewPostModal({ visible, onClose, onSubmit }: NewPostModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);

  function handleSubmit() {
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content);
    if (!cleanTitle || !cleanContent) {
      Alert.alert('שגיאה', 'יש למלא כותרת ותוכן');
      return;
    }
    if (!passesModeration(cleanTitle) || !passesModeration(cleanContent)) {
      Alert.alert('תוכן לא מתאים', 'הפוסט מכיל תוכן שאינו עומד בכללי הקהילה');
      return;
    }
    const adjectives = ['פרח', 'כוכב', 'ירח', 'שמש', 'ענן', 'גן', 'נהר'];
    const nouns = ['זהב', 'כסף', 'ורד', 'ים', 'שמיים', 'אור', 'בוקר'];
    const handle = `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${nouns[Math.floor(Math.random() * nouns.length)]}`;
    onSubmit({ anonymousHandle: handle, title: cleanTitle, content: cleanContent, category });
    setTitle('');
    setContent('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={modalStyles.kav}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />
            <Text style={modalStyles.title}>פוסט חדש</Text>
            <Text style={modalStyles.anonNote}>🌸 הפוסט יפורסם בעילום שם</Text>

            <Text style={modalStyles.label}>קטגוריה</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={modalStyles.categoryRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[modalStyles.chip, category === c && modalStyles.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[modalStyles.chipText, category === c && modalStyles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={modalStyles.label}>כותרת</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="נושא הפוסט..."
              placeholderTextColor={colors.neutral.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              textAlign="right"
            />

            <Text style={modalStyles.label}>תוכן</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.inputMulti]}
              placeholder="שתפי את המחשבות שלך..."
              placeholderTextColor={colors.neutral.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={1000}
              textAlign="right"
            />

            <TouchableOpacity
              style={[modalStyles.submitBtn, (!title.trim() || !content.trim()) && modalStyles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!title.trim() || !content.trim()}
            >
              <Text style={modalStyles.submitText}>פרסמי</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>ביטול</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function CommunityScreen() {
  const [posts, setPosts] = useState<ForumPost[]>(DEMO_POSTS);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);

  const filtered = activeCategory ? posts.filter((p) => p.category === activeCategory) : posts;

  function handleNewPost(post: Omit<ForumPost, 'id' | 'createdAt' | 'replyCount'>) {
    const newPost: ForumPost = {
      ...post,
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      replyCount: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>קהילה</Text>
        <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowNewPost(true)}>
          <Text style={styles.newPostText}>+ פוסט חדש</Text>
        </TouchableOpacity>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, !activeCategory && styles.chipActive]}
          onPress={() => setActiveCategory(null)}
        >
          <Text style={[styles.chipText, !activeCategory && styles.chipTextActive]}>הכל</Text>
        </TouchableOpacity>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, activeCategory === c && styles.chipActive]}
            onPress={() => setActiveCategory(activeCategory === c ? null : c)}
          >
            <Text style={[styles.chipText, activeCategory === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{item.category}</Text>
              </View>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.handle}>🌸 {item.anonymousHandle}</Text>
              <Text style={styles.replies}>💬 {item.replyCount} תגובות</Text>
            </View>
          </View>
        )}
      />

      <NewPostModal
        visible={showNewPost}
        onClose={() => setShowNewPost(false)}
        onSubmit={handleNewPost}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.neutral.text },
  newPostBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  newPostText: { color: colors.neutral.white, fontSize: typography.size.sm, fontWeight: '700' },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderColor: colors.neutral.beigeDeep,
  },
  chipActive: { borderColor: colors.primary.gold, backgroundColor: '#FFF8E7' },
  chipText: { fontSize: typography.size.sm, color: colors.neutral.textLight },
  chipTextActive: { color: colors.primary.gold, fontWeight: '700' },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  categoryPill: {
    backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryPillText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, fontWeight: '600' },
  time: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  postTitle: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.text, marginBottom: 4, textAlign: 'right' },
  postContent: { fontSize: typography.size.sm, color: colors.neutral.textLight, lineHeight: 20, textAlign: 'right', marginBottom: spacing.md },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handle: { fontSize: typography.size.xs, color: colors.primary.rose, fontWeight: '600' },
  replies: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.neutral.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral.beigeDeep, alignSelf: 'center', marginBottom: spacing.lg },
  title: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral.text, marginBottom: 4 },
  anonNote: { fontSize: typography.size.sm, color: colors.primary.rose, marginBottom: spacing.lg },
  label: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral.textMuted, marginBottom: spacing.xs, textAlign: 'right' },
  categoryRow: { gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderColor: colors.neutral.beigeDeep,
  },
  chipActive: { borderColor: colors.primary.gold, backgroundColor: '#FFF8E7' },
  chipText: { fontSize: typography.size.sm, color: colors.neutral.textLight },
  chipTextActive: { color: colors.primary.gold, fontWeight: '700' },
  input: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.size.md,
    color: colors.neutral.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral.beigeDeep,
  },
  inputMulti: { height: 100, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: colors.primary.gold,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.neutral.textMuted, fontSize: typography.size.md },
});
