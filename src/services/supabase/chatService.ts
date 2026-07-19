import { supabase } from '../../config/supabase';
import { Rabbi, ChatMessage } from '../../types/models';
import { RealtimeChannel } from '@supabase/supabase-js';

// ── DB row shapes ──────────────────────────────────────────
interface RabbiRow {
  id: string;
  name: string;
  specialty: 'sephardi' | 'ashkenazi';
  is_available: boolean;
  avatar_url: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'rabbi';
  content: string;
  image_path: string | null;
  is_encrypted: boolean;
  created_at: string;
}

// ── Mappers ────────────────────────────────────────────────
function rowToRabbi(r: RabbiRow): Rabbi {
  return {
    id: r.id,
    name: r.name,
    specialty: r.specialty,
    isAvailable: r.is_available,
    avatarUrl: r.avatar_url ?? undefined,
  };
}

function rowToMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    senderType: r.sender_type,
    content: r.content,
    imageUrl: r.image_path ?? undefined,
    isEncrypted: r.is_encrypted,
    createdAt: r.created_at,
  };
}

// ── Service ────────────────────────────────────────────────

/** Fetch all rabbis, optionally filtered by specialty. */
export async function fetchRabbis(specialty?: 'sephardi' | 'ashkenazi'): Promise<Rabbi[]> {
  let query = supabase.from('rabbis').select('*').order('name');
  if (specialty) query = query.eq('specialty', specialty);
  const { data, error } = await query;
  if (error) throw error;
  return (data as RabbiRow[]).map(rowToRabbi);
}

/** Find an existing conversation for the user without creating one. Returns null if none. */
export async function findExistingConversation(userId: string): Promise<{ id: string; createdAt: string } | null> {
  const { data } = await supabase
    .from('conversations')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? { id: (data as { id: string; created_at: string }).id, createdAt: (data as { id: string; created_at: string }).created_at } : null;
}

/** Delete a conversation and all its messages. */
export async function deleteConversation(conversationId: string): Promise<void> {
  await supabase.from('chat_messages').delete().eq('conversation_id', conversationId);
  await supabase.from('conversations').delete().eq('id', conversationId);
}

/** Subscribe to conversation deletion. Returns unsubscribe fn. */
export function subscribeToConversationDeleted(
  conversationId: string,
  onDeleted: () => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`conv_delete:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      },
      () => onDeleted(),
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/** Get or create an unassigned conversation for the user (no specific rabbi). */
export async function getOrCreateUnassignedConversation(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .is('rabbi_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return (existing as { id: string }).id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, rabbi_id: null })
    .select('id')
    .single();

  if (error) throw error;
  return (created as { id: string }).id;
}

/** Fetch the rabbi assigned to a conversation, if any. */
export async function fetchConversationRabbi(conversationId: string): Promise<Rabbi | null> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('rabbi_id')
    .eq('id', conversationId)
    .single();

  if (!conv || !(conv as { rabbi_id: string | null }).rabbi_id) return null;

  const { data: rabbi } = await supabase
    .from('rabbis')
    .select('*')
    .eq('id', (conv as { rabbi_id: string }).rabbi_id)
    .single();

  return rabbi ? rowToRabbi(rabbi as RabbiRow) : null;
}

/** Get or create a conversation between the current user and a rabbi. */
export async function getOrCreateConversation(
  userId: string,
  rabbiId: string,
): Promise<string> {
  // Try to find existing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('rabbi_id', rabbiId)
    .single();

  if (existing) return existing.id as string;

  // Create new
  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, rabbi_id: rabbiId })
    .select('id')
    .single();

  if (error) throw error;
  return (created as { id: string }).id;
}

/** Fetch all messages in a conversation. */
export async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as MessageRow[]).map(rowToMessage);
}

/** Send a text message. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderType: 'user' | 'rabbi',
  content: string,
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_type: senderType,
      content,
      is_encrypted: true,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToMessage(data as MessageRow);
}

/** Upload an image to Supabase Storage and send as a message. */
export async function sendImageMessage(
  conversationId: string,
  senderId: string,
  localUri: string,
): Promise<ChatMessage> {
  // Fetch the file as blob
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = localUri.split('.').pop() ?? 'jpg';
  const storagePath = `chat/${conversationId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('chat-images')
    .upload(storagePath, blob, { contentType: `image/${ext}`, upsert: false });

  if (uploadErr) throw uploadErr;

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      sender_type: 'user',
      content: '',
      image_path: storagePath,
      is_encrypted: true,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToMessage(data as MessageRow);
}

/** Subscribe to new messages in a conversation (realtime). Returns unsubscribe fn. */
export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`chat:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(rowToMessage(payload.new as MessageRow)),
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}
