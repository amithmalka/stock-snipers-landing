// Edge Function: notify-booking
// Triggered by DB Webhook on: INSERT or UPDATE to booking_requests
//
// INSERT (new booking request) → Web Push to provider
// UPDATE status=confirmed      → Expo push to user + cancel other pending requests in same category

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@siel.app'

async function sendExpoPush(token: string, title: string, body: string) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  })
}

async function sendWebPush(subscription: Record<string, unknown>, title: string, body: string) {
  // Use web-push compatible approach via Supabase's built-in fetch
  // Requires VAPID keys set as env vars
  const { default: webpush } = await import('npm:web-push@3')
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  await webpush.sendNotification(
    subscription,
    JSON.stringify({ title, body }),
  )
}

Deno.serve(async (req) => {
  const { record, old_record, type } = await req.json()

  if (type === 'INSERT') {
    // New booking request → notify provider via Web Push
    const { provider_id, user_id, requested_time } = record

    const { data: subRow } = await supabase
      .from('provider_web_push_subscriptions')
      .select('subscription')
      .eq('provider_id', provider_id)
      .single()

    if (subRow?.subscription) {
      const timeStr = new Date(requested_time).toLocaleTimeString('he-IL', {
        hour: '2-digit', minute: '2-digit',
      })
      await sendWebPush(
        subRow.subscription,
        'בקשת תור חדשה',
        `לקוחה מבקשת תור בשעה ${timeStr}`,
      ).catch(() => {})
    }
  } else if (type === 'UPDATE' && record.status === 'confirmed' && old_record?.status !== 'confirmed') {
    // Booking confirmed → notify user + cancel other pending requests in same category
    const { user_id, provider_id, requested_time, id: confirmedId } = record

    // Get provider category
    const { data: provider } = await supabase
      .from('service_providers')
      .select('category')
      .eq('id', provider_id)
      .single()

    if (provider?.category) {
      // Find all other providers in same category
      const { data: sameCategory } = await supabase
        .from('service_providers')
        .select('id')
        .eq('category', provider.category)
        .neq('id', provider_id)

      const otherProviderIds = (sameCategory ?? []).map((p: { id: string }) => p.id)

      if (otherProviderIds.length > 0) {
        // Cancel other pending requests from same user in same category
        await supabase
          .from('booking_requests')
          .update({ status: 'cancelled' })
          .eq('user_id', user_id)
          .eq('requested_time', requested_time)
          .eq('status', 'pending')
          .neq('id', confirmedId)
          .in('provider_id', otherProviderIds)
      }
    }

    // Notify user via Expo push
    const { data: tokenRow } = await supabase
      .from('user_push_tokens')
      .select('token')
      .eq('user_id', user_id)
      .single()

    if (tokenRow?.token) {
      const { data: providerRow } = await supabase
        .from('service_providers')
        .select('name')
        .eq('id', provider_id)
        .single()

      await sendExpoPush(
        tokenRow.token,
        'התור אושר! ✅',
        `${providerRow?.name ?? 'בעלת העסק'} אישרה את התור שלך`,
      )
    }
  }

  return new Response('ok', { status: 200 })
})
