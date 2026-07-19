import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { Rabbi, ChatMessage } from '../../types/models';
import { HalachicProfile } from '../../types/halachic';
import { sanitizeInput } from '../../utils/moderation';
import {
  getOrCreateUnassignedConversation,
  fetchMessages,
  fetchConversationRabbi,
  sendMessage,
  sendImageMessage,
  subscribeToMessages,
  subscribeToConversationDeleted,
} from '../../services/supabase/chatService';
import { isSupabaseConfigured } from '../../config/supabase';
import { supabase } from '../../config/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

export interface ChatScreenProps {
  halachicProfile?: HalachicProfile;
  onBack: () => void;
}

export default function ChatScreen({ halachicProfile = 'sephardi', onBack }: ChatScreenProps) {
  const { t } = useLanguage();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [assignedRabbi, setAssignedRabbi] = useState<Rabbi | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const listRef = useRef<FlatList>(null);
  const assignedRabbiRef = useRef<Rabbi | null>(null);

  const makeWelcome = (convId: string): ChatMessage => ({
    id: 'welcome',
    conversationId: convId,
    senderId: 'system',
    senderType: 'rabbi',
    content: 'שלום! שלחי את שאלתך ורב פוסק יענה בהקדם.',
    isEncrypted: true,
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    async function init() {
      if (!isSupabaseConfigured) {
        setMessages([makeWelcome('demo')]);
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setIsLoading(false); return; }

        const uid = session.user.id;
        setUserId(uid);

        const convId = await getOrCreateUnassignedConversation(uid);
        setConversationId(convId);

        const existing = await fetchMessages(convId);
        setMessages(existing.length === 0 ? [makeWelcome(convId)] : existing);

        const rabbi = await fetchConversationRabbi(convId);
        if (rabbi) {
          setAssignedRabbi(rabbi);
          assignedRabbiRef.current = rabbi;
        }
      } catch {
        setMessages([makeWelcome('demo')]);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured) return;
    const unsubDelete = subscribeToConversationDeleted(conversationId, () => onBack());
    return unsubDelete;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured) return;
    const unsubscribe = subscribeToMessages(conversationId, async (msg) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      listRef.current?.scrollToEnd({ animated: true });

      if (msg.senderType === 'rabbi' && !assignedRabbiRef.current) {
        const rabbi = await fetchConversationRabbi(conversationId);
        if (rabbi) {
          setAssignedRabbi(rabbi);
          assignedRabbiRef.current = rabbi;
        }
      }
    });
    return unsubscribe;
  }, [conversationId]);

  async function handleSend() {
    const trimmed = sanitizeInput(inputText);
    if (!trimmed || isSending) return;
    setInputText('');
    setIsSending(true);

    if (!isSupabaseConfigured || !conversationId || !userId) {
      setMessages((prev) => [...prev, {
        id: String(Date.now()),
        conversationId: 'demo',
        senderId: 'me',
        senderType: 'user' as const,
        content: trimmed,
        isEncrypted: true,
        createdAt: new Date().toISOString(),
      }]);
      setIsSending(false);
      return;
    }

    try {
      const msg = await sendMessage(conversationId, userId, 'user', trimmed);
      setMessages((prev) => [...prev, msg]);
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      Alert.alert(t.error, t.errorSendMsg);
    } finally {
      setIsSending(false);
    }
  }

  async function handleImagePick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.permissionRequired, t.galleryPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;

    if (!isSupabaseConfigured || !conversationId || !userId) {
      setMessages((prev) => [...prev, {
        id: String(Date.now()),
        conversationId: 'demo',
        senderId: 'me',
        senderType: 'user' as const,
        content: t.imageAttached,
        imageUrl: uri,
        isEncrypted: true,
        createdAt: new Date().toISOString(),
      }]);
      return;
    }

    try {
      const msg = await sendImageMessage(conversationId, userId, uri);
      setMessages((prev) => [...prev, msg]);
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      Alert.alert(t.error, t.errorUpload);
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isMe = item.senderId === userId || item.senderId === 'me';
    const isRabbi = item.senderType === 'rabbi' && item.senderId !== 'system';
    const showName = isRabbi && assignedRabbi;

    return (
      <View style={[styles.bubbleWrap, isMe ? styles.bubbleWrapMe : styles.bubbleWrapRabbi]}>
        {showName && (
          <Text style={styles.rabbiLabel}>{assignedRabbi!.name}</Text>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleRabbi]}>
          {item.imageUrl ? (
            <Text style={styles.imgPlaceholder}>📎 {t.imageAttached}</Text>
          ) : (
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          )}
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {new Date(item.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            {item.isEncrypted ? ' 🔒' : ''}
          </Text>
        </View>
      </View>
    );
  }

  const headerName = assignedRabbi ? assignedRabbi.name : 'רב פוסק טהרה';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{headerName}</Text>
          <Text style={styles.headerStatus}>
            {assignedRabbi ? `● ${t.statusAvailable}` : `○ ${t.waitingForRabbi}`}
          </Text>
        </View>
        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>🔒 {t.encrypted}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary.gold} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={() => {
              const hasUserMsg = messages.some(m => m.senderType === 'user');
              const hasRabbiReply = messages.some(m => m.senderType === 'rabbi' && m.senderId !== 'system');
              if (!hasUserMsg || hasRabbiReply) return null;
              return (
                <View style={styles.waitingWrap}>
                  <ActivityIndicator size="small" color={colors.primary.gold} style={{ marginBottom: spacing.xs }} />
                  <Text style={styles.waitingText}>{t.waitingForRabbi}</Text>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleImagePick}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t.chatPlaceholder}
            placeholderTextColor={colors.neutral.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            <Text style={styles.sendIcon}>›</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral.beige },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.neutral.beigeDeep, gap: spacing.sm,
  },
  backBtn: { padding: spacing.sm },
  backArrow: { fontSize: 28, color: colors.primary.gold, fontWeight: '300' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.text },
  headerStatus: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  lockBadge: {
    backgroundColor: '#EFF6FF', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  lockText: { fontSize: typography.size.xs, color: colors.status.info },
  messageList: { padding: spacing.md },
  bubbleWrap: { marginBottom: spacing.sm },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubbleWrapRabbi: { alignItems: 'flex-start' },
  rabbiLabel: {
    fontSize: typography.size.xs, color: colors.primary.gold,
    fontWeight: '600', marginBottom: 2, marginLeft: spacing.sm,
  },
  bubble: { maxWidth: '80%', borderRadius: borderRadius.lg, padding: spacing.md },
  bubbleRabbi: { backgroundColor: colors.neutral.white, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: colors.primary.gold, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: typography.size.md, color: colors.neutral.text, lineHeight: 22 },
  bubbleTextMe: { color: colors.neutral.white },
  bubbleTime: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  imgPlaceholder: { fontSize: typography.size.md, color: colors.neutral.textLight },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.neutral.white,
    borderTopWidth: 0.5, borderTopColor: colors.neutral.beigeDeep,
    padding: spacing.sm, gap: spacing.sm,
  },
  attachBtn: { padding: spacing.sm },
  attachIcon: { fontSize: 22 },
  input: {
    flex: 1, backgroundColor: colors.neutral.beige, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: typography.size.md, color: colors.neutral.text, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary.gold, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 24, color: colors.neutral.white, fontWeight: '700' },
  waitingWrap: { alignItems: 'center', paddingVertical: spacing.lg },
  waitingText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, marginTop: spacing.xs },
});
