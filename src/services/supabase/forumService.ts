import { supabase } from '../../config/supabase';
import { ForumPost } from '../../types/models';
import { passesModeration, sanitizeInput } from '../../utils/moderation';

interface PostRow {
  id: string;
  anonymous_handle: string;
  title: string;
  content: string;
  category: string;
  reply_count: number;
  is_moderated: boolean;
  created_at: string;
}

interface ReplyRow {
  id: string;
  post_id: string;
  anonymous_handle: string;
  content: string;
  is_moderated: boolean;
  created_at: string;
}

export interface ForumReply {
  id: string;
  postId: string;
  anonymousHandle: string;
  content: string;
  createdAt: string;
}

function rowToPost(r: PostRow): ForumPost {
  return {
    id: r.id,
    anonymousHandle: r.anonymous_handle,
    title: r.title,
    content: r.content,
    category: r.category,
    replyCount: r.reply_count,
    createdAt: r.created_at,
  };
}

function rowToReply(r: ReplyRow): ForumReply {
  return {
    id: r.id,
    postId: r.post_id,
    anonymousHandle: r.anonymous_handle,
    content: r.content,
    createdAt: r.created_at,
  };
}

function generateHandle(): string {
  const adj = ['פרח', 'כוכב', 'ירח', 'שמש', 'ענן', 'גן', 'נהר', 'אור', 'רוח'];
  const noun = ['זהב', 'כסף', 'ורד', 'ים', 'שמיים', 'בוקר', 'לילה', 'קיץ'];
  return `${adj[Math.floor(Math.random() * adj.length)]}_${noun[Math.floor(Math.random() * noun.length)]}`;
}

/** Fetch non-moderated posts, newest first. */
export async function fetchPosts(category?: string): Promise<ForumPost[]> {
  let query = supabase
    .from('forum_posts')
    .select('*')
    .eq('is_moderated', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) throw error;
  return (data as PostRow[]).map(rowToPost);
}

/** Create a new post. Throws if content fails moderation. */
export async function createPost(
  title: string,
  content: string,
  category: string,
): Promise<ForumPost> {
  const cleanTitle = sanitizeInput(title);
  const cleanContent = sanitizeInput(content);

  if (!passesModeration(cleanTitle) || !passesModeration(cleanContent)) {
    throw new Error('הפוסט מכיל תוכן שאינו עומד בכללי הקהילה');
  }

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      anonymous_handle: generateHandle(),
      title: cleanTitle,
      content: cleanContent,
      category,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToPost(data as PostRow);
}

/** Fetch replies for a post. */
export async function fetchReplies(postId: string): Promise<ForumReply[]> {
  // PRIMARY: backoffice API (bypasses RLS / CORS / session issues)
  try {
    const res = await fetch(`/api/public-forum-replies?postId=${encodeURIComponent(postId)}&_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.replies)) {
        return (json.replies as ReplyRow[]).map(rowToReply);
      }
    }
  } catch (e) {
    console.warn('[fetchReplies] API failed, falling back to direct Supabase:', e);
  }

  // FALLBACK: direct Supabase
  const { data, error } = await supabase
    .from('forum_replies')
    .select('*')
    .eq('post_id', postId)
    .eq('is_moderated', false)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as ReplyRow[]).map(rowToReply);
}

/** Add a reply to a post. Throws if content fails moderation. */
export async function createReply(
  postId: string,
  content: string,
): Promise<ForumReply> {
  const clean = sanitizeInput(content);
  if (!passesModeration(clean)) {
    throw new Error('התגובה מכילה תוכן שאינו עומד בכללי הקהילה');
  }

  const { data, error } = await supabase
    .from('forum_replies')
    .insert({
      post_id: postId,
      anonymous_handle: generateHandle(),
      content: clean,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToReply(data as ReplyRow);
}
