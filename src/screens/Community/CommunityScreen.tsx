import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

const WEB_ICON_MAP: Record<string, string> = {
  'arrow-right': '←', send: '➤', 'edit-2': '✏', 'message-circle': '💬',
};
function Icon({ name, size, color, style }: { name: string; size: number; color?: string; style?: object }) {
  if (Platform.OS === 'web') {
    return <Text style={[{ fontSize: size * 0.9, lineHeight: size * 1.3, color }, style]}>{WEB_ICON_MAP[name] ?? '•'}</Text>;
  }
  return <Icon name={name as React.ComponentProps<typeof Feather>['name']} size={size} color={color} style={style} />;
}
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { ForumPost } from '../../types/models';
import { passesModeration, sanitizeInput } from '../../utils/moderation';
import {
  fetchPosts,
  createPost,
  fetchReplies,
  createReply,
  ForumReply,
} from '../../services/supabase/forumService';
import { isSupabaseConfigured } from '../../config/supabase';
import { useLanguage } from '../../contexts/LanguageContext';


function generateHandle(): string {
  const adj = ['פרח', 'כוכב', 'ירח', 'שמש', 'ענן', 'גן', 'נהר', 'אור', 'רוח'];
  const noun = ['זהב', 'כסף', 'ורד', 'ים', 'שמיים', 'בוקר', 'לילה', 'קיץ'];
  return `${adj[Math.floor(Math.random() * adj.length)]}_${noun[Math.floor(Math.random() * noun.length)]}`;
}

interface NewPostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => void;
}

function NewPostModal({ visible, onClose, onSubmit }: NewPostModalProps) {
  const { t } = useLanguage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  function handleSubmit() {
    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content);
    if (!cleanTitle || !cleanContent) {
      Alert.alert(t.error, t.fillTitleAndContent);
      return;
    }
    if (!passesModeration(cleanTitle) || !passesModeration(cleanContent)) {
      Alert.alert(t.inappropriateContent, t.postBreachRules);
      return;
    }
    onSubmit(cleanTitle, cleanContent);
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
            <Text style={modalStyles.sheetTitle}>{t.newPostModalTitle}</Text>
            <Text style={modalStyles.anonNote}>{t.anonNote}</Text>

            <Text style={modalStyles.label}>{t.titleLabel}</Text>
            <TextInput
              style={modalStyles.input}
              placeholder={t.titlePlaceholder}
              placeholderTextColor={colors.neutral.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              textAlign="right"
            />

            <Text style={modalStyles.label}>{t.contentLabel}</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.inputMulti]}
              placeholder={t.contentPlaceholder}
              placeholderTextColor={colors.neutral.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              maxLength={1000}
              textAlign="right"
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[modalStyles.submitBtn, (!title.trim() || !content.trim()) && modalStyles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!title.trim() || !content.trim()}
            >
              <Text style={modalStyles.submitText}>{t.publish}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={modalStyles.cancelText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

interface PostDetailProps {
  post: ForumPost;
  onBack: () => void;
  onReplyAdded: (postId: string) => void;
}

function PostDetail({ post, onBack, onReplyAdded }: PostDetailProps) {
  const { t } = useLanguage();
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  function timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t.timeMinutesAgo(mins);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t.timeHoursAgo(hours);
    return t.timeDaysAgo(Math.floor(hours / 24));
  }

  useEffect(() => {
    if (isSupabaseConfigured) {
      fetchReplies(post.id)
        .then(setReplies)
        .catch(() => setReplies([]))
        .finally(() => setIsLoading(false));
    } else {
      setReplies([]);
      setIsLoading(false);
    }
  }, [post.id]);

  async function handleSendReply() {
    const clean = sanitizeInput(replyText);
    if (!clean) return;
    if (!passesModeration(clean)) {
      Alert.alert(t.inappropriateContent, t.replyBreachRules);
      return;
    }
    setIsSending(true);
    try {
      let reply: ForumReply;
      if (isSupabaseConfigured) {
        reply = await createReply(post.id, clean);
      } else {
        reply = {
          id: String(Date.now()),
          postId: post.id,
          anonymousHandle: generateHandle(),
          content: clean,
          createdAt: new Date().toISOString(),
        };
      }
      setReplies((prev) => [...prev, reply]);
      setReplyText('');
      onReplyAdded(post.id);
    } catch (e: unknown) {
      Alert.alert(t.error, e instanceof Error ? e.message : t.errorCannotReply);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={detailStyles.header}>
        <TouchableOpacity onPress={onBack} style={detailStyles.backBtn}>
          <Icon name="arrow-right" size={22} color={colors.neutral.text} />
        </TouchableOpacity>
        <Text style={detailStyles.headerTitle}>{t.postLabel}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          data={replies}
          keyExtractor={(r) => r.id}
          contentContainerStyle={detailStyles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <View style={detailStyles.postCard}>
                <Text style={detailStyles.postTitle}>{post.title}</Text>
                <Text style={detailStyles.postContent}>{post.content}</Text>
                <View style={detailStyles.postMeta}>
                  <Text style={detailStyles.handle}>{post.anonymousHandle}</Text>
                  <Text style={detailStyles.time}>{timeAgo(post.createdAt)}</Text>
                </View>
              </View>
              <Text style={detailStyles.repliesLabel}>{replies.length} {t.repliesCount}</Text>
            </>
          }
          ListEmptyComponent={
            isLoading
              ? <ActivityIndicator color={colors.primary.gold} style={{ marginTop: spacing.lg }} />
              : <Text style={detailStyles.noReplies}>{t.beFirstToReply}</Text>
          }
          renderItem={({ item }) => (
            <View style={detailStyles.replyCard}>
              <View style={detailStyles.replyMeta}>
                <Text style={detailStyles.replyHandle}>{item.anonymousHandle}</Text>
                <Text style={detailStyles.replyTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={detailStyles.replyContent}>{item.content}</Text>
            </View>
          )}
        />

        <View style={detailStyles.replyBar}>
          <TextInput
            style={detailStyles.replyInput}
            placeholder={t.replyAnonPlaceholder}
            placeholderTextColor={colors.neutral.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            maxLength={500}
            textAlign="right"
            multiline
          />
          <TouchableOpacity
            style={[detailStyles.sendBtn, (!replyText.trim() || isSending) && detailStyles.sendBtnDisabled]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || isSending}
          >
            {isSending
              ? <ActivityIndicator size="small" color={colors.neutral.white} />
              : <Icon name="send" size={18} color={colors.neutral.white} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function CommunityScreen() {
  const { t } = useLanguage();

  function timeAgo(isoDate: string): string {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return t.timeMinutesAgo(mins);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t.timeHoursAgo(hours);
    return t.timeDaysAgo(Math.floor(hours / 24));
  }

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    setIsLoading(true);
    fetchPosts()
      .then(setPosts)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleNewPost = useCallback(async (title: string, content: string) => {
    if (isSupabaseConfigured) {
      try {
        const created = await createPost(title, content, 'כללי');
        setPosts((prev) => [created, ...prev]);
      } catch (e: unknown) {
        Alert.alert(t.error, e instanceof Error ? e.message : t.errorCannotPost);
      }
    } else {
      setPosts((prev) => [{
        id: String(Date.now()),
        anonymousHandle: generateHandle(),
        title,
        content,
        category: 'כללי',
        createdAt: new Date().toISOString(),
        replyCount: 0,
      }, ...prev]);
    }
  }, [t]);

  const handleReplyAdded = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => p.id === postId ? { ...p, replyCount: p.replyCount + 1 } : p)
    );
  }, []);

  if (selectedPost) {
    return (
      <PostDetail
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        onReplyAdded={handleReplyAdded}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.communityTitle}</Text>
        <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowNewPost(true)}>
          <Icon name="edit-2" size={14} color={colors.neutral.white} style={{ marginRight: 4 }} />
          <Text style={styles.newPostText}>{t.newPost}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading
            ? <ActivityIndicator color={colors.primary.gold} style={{ marginTop: spacing.xl }} />
            : <Text style={styles.empty}>{t.noPosts}</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelectedPost(item)} activeOpacity={0.75}>
            <Text style={styles.postTitle}>{item.title}</Text>
            <Text style={styles.postContent} numberOfLines={2}>{item.content}</Text>
            <View style={styles.cardBottom}>
              <Text style={styles.handle}>{item.anonymousHandle}</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                <View style={styles.replyCount}>
                  <Icon name="message-circle" size={12} color={colors.neutral.textMuted} />
                  <Text style={styles.replyCountText}>{item.replyCount}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingBottom: spacing.md },
  title: { fontSize: typography.size.xxl, fontWeight: '700', color: colors.neutral.text },
  newPostBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary.gold, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4 },
  newPostText: { color: colors.neutral.white, fontSize: typography.size.sm, fontWeight: '700' },
  list: { padding: spacing.lg, gap: spacing.sm, paddingTop: spacing.xs },
  card: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.md, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  postTitle: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.text, marginBottom: 6, textAlign: 'right' },
  postContent: { fontSize: typography.size.sm, color: colors.neutral.textLight, lineHeight: 20, textAlign: 'right', marginBottom: spacing.md },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handle: { fontSize: typography.size.xs, color: colors.primary.rose, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  time: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  replyCount: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  replyCountText: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  empty: { textAlign: 'center', color: colors.neutral.textMuted, marginTop: spacing.xl, fontSize: typography.size.sm },
});

const detailStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.neutral.beigeDeep, backgroundColor: colors.neutral.white },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  postCard: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  postTitle: { fontSize: typography.size.lg, fontWeight: '700', color: colors.neutral.text, textAlign: 'right', marginBottom: spacing.sm },
  postContent: { fontSize: typography.size.md, color: colors.neutral.textLight, lineHeight: 24, textAlign: 'right', marginBottom: spacing.md },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handle: { fontSize: typography.size.sm, color: colors.primary.rose, fontWeight: '600' },
  time: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  repliesLabel: { fontSize: typography.size.sm, fontWeight: '700', color: colors.neutral.textMuted, textAlign: 'right', marginBottom: spacing.sm, letterSpacing: 0.3 },
  noReplies: { textAlign: 'center', color: colors.neutral.textMuted, fontSize: typography.size.sm, marginTop: spacing.lg },
  replyCard: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  replyMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  replyHandle: { fontSize: typography.size.xs, color: colors.primary.rose, fontWeight: '600' },
  replyTime: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  replyContent: { fontSize: typography.size.sm, color: colors.neutral.text, lineHeight: 20, textAlign: 'right' },
  replyBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.md, paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md, backgroundColor: colors.neutral.white, borderTopWidth: 0.5, borderTopColor: colors.neutral.beigeDeep },
  replyInput: { flex: 1, backgroundColor: colors.neutral.beige, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.size.sm, color: colors.neutral.text, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.45 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.neutral.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral.beigeDeep, alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle: { fontSize: typography.size.xl, fontWeight: '700', color: colors.neutral.text, marginBottom: 4, textAlign: 'right' },
  anonNote: { fontSize: typography.size.sm, color: colors.primary.rose, marginBottom: spacing.lg, textAlign: 'right' },
  label: { fontSize: typography.size.sm, fontWeight: '600', color: colors.neutral.textMuted, marginBottom: spacing.xs, textAlign: 'right' },
  input: { backgroundColor: colors.neutral.white, borderRadius: borderRadius.md, padding: spacing.md, fontSize: typography.size.md, color: colors.neutral.text, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.neutral.beigeDeep },
  inputMulti: { height: 120 },
  submitBtn: { backgroundColor: colors.primary.gold, borderRadius: borderRadius.full, paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: colors.neutral.white, fontSize: typography.size.md, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.neutral.textMuted, fontSize: typography.size.md },
});
