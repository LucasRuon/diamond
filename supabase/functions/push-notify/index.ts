// push-notify — interna (service_role). Envia push para um user_id via web-push.
// Body: { user_id, title, body, url? }
// Header: Authorization: Bearer <SERVICE_ROLE_KEY>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3.6.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@diamondx.app'
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
  } catch (err) {
    console.error('[push-notify] setVapidDetails falhou:', err)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405)

  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return json({ error: 'VAPID nao configurada.' }, 500)
    if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'Config incompleta.' }, 500)

    // Aceita chamadas com service_role (header Authorization) ou apikey
    const auth = req.headers.get('Authorization') ?? ''
    const apikey = req.headers.get('apikey') ?? ''
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
    if (token !== SERVICE_ROLE && apikey !== SERVICE_ROLE) {
      return json({ error: 'Acesso negado.' }, 403)
    }

    const body = await req.json().catch(() => null) as
      | { user_id?: string; title?: string; body?: string; url?: string; tag?: string }
      | null
    if (!body?.user_id || !body?.title) return json({ error: 'Payload invalido.' }, 400)

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: subs, error: subsErr } = await admin
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', body.user_id)

    if (subsErr) return json({ error: subsErr.message }, 400)
    if (!subs?.length) return json({ ok: true, sent: 0, reason: 'no-subscriptions' })

    const payload = JSON.stringify({
      title: body.title,
      body: body.body ?? '',
      url: body.url ?? '/#trainings',
      tag: body.tag ?? `dx-${Date.now()}`
    })

    let sent = 0
    const toRemove: string[] = []
    for (const s of subs) {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth }
        }, payload)
        sent++
      } catch (err: any) {
        const status = err?.statusCode || err?.status
        console.warn('[push-notify] envio falhou', status, err?.body || err?.message)
        if (status === 404 || status === 410) toRemove.push(s.id)
      }
    }
    if (toRemove.length) {
      await admin.from('push_subscriptions').delete().in('id', toRemove)
    }

    return json({ ok: true, sent, removed: toRemove.length })
  } catch (err: any) {
    return json({ error: String(err?.message || err) }, 500)
  }
})
