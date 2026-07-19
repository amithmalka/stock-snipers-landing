// Edge Function: notify-chat
// Triggered by DB Webhook on: INSERT to chat_messages
// - sender_type='user'  → push to all available rabbis (Expo push)
// - sender_type='rabbi' → push to the conversation's user (Expo push)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function sendExpoPush(tokens: string[], title: string, body: string) {
  const messages = tokens.map((to) => ({ to, title, body, sound: 'default' }))
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
}

Deno.serve(async (req) => {
  const { record } = await req.json()
  const { conversation_id, sender_type, content } = record

  if (sender_type === 'user') {
    // Notify all rabbis who have a push token
    const { data: tokens } = await supabase
      .from('rabbi_push_tokens')
      .select('token')
    if (tokens && tokens.length > 0) {
      await sendExpoPush(
        tokens.map((r: { token: string }) => r.token),
        'שאלה חדשה מהמשתמשת',
        content?.slice(0, 100) ?? 'הודעה חדשה',
      )
    }
  } else if (sender_type === 'rabbi') {
    // Notify the user of this conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversation_id)
      .single()
    if (conv?.user_id) {
      const { data: tokenRow } = await supabase
        .from('user_push_tokens')
        .select('token')
        .eq('user_id', conv.user_id)
        .single()
      if (tokenRow?.token) {
        await sendExpoPush(
          [tokenRow.token],
          'תגובה מהרב',
          content?.slice(0, 100) ?? 'הרב ענה לשאלתך',
        )
      }
    }
  }

  return new Response('ok', { status: 200 })
})
