import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, borderRadius } from '../../config/theme';
import { Rabbi, ChatMessage } from '../../types/models';
import { sanitizeInput } from '../../utils/moderation';

interface ChatScreenProps {
  rabbi: Rabbi;
  onBack: () => void;
}

export default function ChatScreen({ rabbi, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      conversationId: 'demo',
      senderId: rabbi.id,
      content: `שלום! אני ${rabbi.name}. כיצד אוכל לסייע לך היום?`,
      isEncrypted: true,
      createdAt: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  function handleSend() {
    const trimmed = sanitizeInput(inputText);
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      conversationId: 'demo',
      senderId: 'me',
      content: trimmed,
      isEncrypted: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    // Simulate rabbi response
    setTimeout(() => {
      const reply: ChatMessage = {
        id: String(Date.now() + 1),
        conversationId: 'demo',
        senderId: rabbi.id,
        content: 'תודה על שאלתך. אבדוק את הנושא ואחזור אלייך בהקדם.',
        isEncrypted: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsSending(false);
      listRef.current?.scrollToEnd({ animated: true });
    }, 1200);
  }

  async function handleImagePick() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאה נדרשת', 'יש לאפשר גישה לגלריה כדי לשלוח תמונות.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const imgMsg: ChatMessage = {
        id: String(Date.now()),
        conversationId: 'demo',
        senderId: 'me',
        content: '[תמונה מצורפת]',
        imageUrl: result.assets[0].uri,
        isEncrypted: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, imgMsg]);
    }
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isMe = item.senderId === 'me';
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleRabbi]}>
        {item.imageUrl ? (
          <Text style={styles.imgPlaceholder}>📎 תמונה מצורפת</Text>
        ) : (
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
        )}
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
          {new Date(item.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          {item.isEncrypted ? ' 🔒' : ''}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{rabbi.name}</Text>
          <Text style={styles.headerStatus}>
            {rabbi.isAvailable ? '● זמין' : '○ עסוק'}
          </Text>
        </View>
        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>🔒 מוצפן</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />

        {isSending && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{rabbi.name} מקליד/ה...</Text>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn} onPress={handleImagePick}>
            <Text style={styles.attachIcon}>📎</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="כתבי שאלה..."
            placeholderTextColor={colors.neutral.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            textAlign="right"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.neutral.beigeDeep,
    gap: spacing.sm,
  },
  backBtn: { padding: spacing.sm },
  backArrow: { fontSize: 28, color: colors.primary.gold, fontWeight: '300' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: typography.size.md, fontWeight: '700', color: colors.neutral.text },
  headerStatus: { fontSize: typography.size.xs, color: colors.neutral.textMuted },
  lockBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  lockText: { fontSize: typography.size.xs, color: colors.status.info },
  messageList: { padding: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleRabbi: {
    backgroundColor: colors.neutral.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: colors.primary.gold,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: typography.size.md, color: colors.neutral.text, lineHeight: 22 },
  bubbleTextMe: { color: colors.neutral.white },
  bubbleTime: {
    fontSize: typography.size.xs,
    color: colors.neutral.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  imgPlaceholder: { fontSize: typography.size.md, color: colors.neutral.textLight },
  typingIndicator: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  typingText: { fontSize: typography.size.xs, color: colors.neutral.textMuted, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.neutral.white,
    borderTopWidth: 0.5,
    borderTopColor: colors.neutral.beigeDeep,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  attachBtn: { padding: spacing.sm },
  attachIcon: { fontSize: 22 },
  input: {
    flex: 1,
    backgroundColor: colors.neutral.beige,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    color: colors.neutral.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 24, color: colors.neutral.white, fontWeight: '700' },
});
