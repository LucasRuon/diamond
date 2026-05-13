// waitlist-tick — cron (a cada 1min via pg_cron / Supabase Scheduled Functions).
// 1. Expira ofertas vencidas e re-promove (chamando promote_waitlist).
// 2. Para cada interest "offered" sem notified_at, envia push via push-notify e marca notified_at.
//
// Header: Authorization: Bearer <SERVICE_ROLE_KEY>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Aceita GET (cron schedulers) e POST. Exige service_role.
  const auth = req.headers.get('Authorization') ?? ''
  const apikey = req.headers.get('apikey') ?? ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : ''
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'Config incompleta.' }, 500)
  if (token !== SERVICE_ROLE && apikey !== SERVICE_ROLE) {
    return json({ error: 'Acesso negado.' }, 403)
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // --- 1) Expira ofertas vencidas e re-promove ---
  const { data: expired, error: expErr } = await admin
    .from('session_interests')
    .select('id, session_id')
    .eq('status', 'offered')
    .lt('expires_at', new Date().toISOString())
  if (expErr) return json({ error: expErr.message }, 500)

  const expiredCount = expired?.length || 0
  const promotedFor: string[] = []
  for (const row of expired || []) {
    await admin.from('session_interests').update({ status: 'expired' }).eq('id', row.id)
    const { error: rpcErr } = await admin.rpc('promote_waitlist', { p_session_id: row.session_id })
    if (rpcErr) console.warn('[waitlist-tick] promote falhou', row.session_id, rpcErr.message)
    else promotedFor.push(row.session_id)
  }

  // --- 2) Enviar push para offered não notificados ---
  const { data: pending, error: pErr } = await admin
    .from('session_interests')
    .select('id, student_id, session_id, expires_at, training_sessions:training_sessions!session_interests_session_id_fkey(id, title, scheduled_at)')
    .eq('status', 'offered')
    .is('notified_at', null)
    .gt('expires_at', new Date().toISOString())
  if (pErr) console.warn('[waitlist-tick] select pending falhou', pErr.message)

  let pushed = 0
  for (const row of pending || []) {
    const s: any = (row as any).training_sessions
    const when = s?.scheduled_at ? new Date(s.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
    const title = 'Vaga disponível 🎯'
    const bodyText = `Você foi convocado para ${s?.title || 'um treino'}${when ? ' em ' + when : ''}. Aceitar em até 30 min.`

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/push-notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE}`,
          'apikey': SERVICE_ROLE,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: row.student_id,
          title,
          body: bodyText,
          url: '/#trainings',
          tag: `offer-${row.id}`
        })
      })
      if (res.ok) pushed++
    } catch (err) {
      console.warn('[waitlist-tick] push falhou', err)
    }
    // marca notified mesmo em falha — fallback in-app cobre; evita spam infinito
    await admin.from('session_interests').update({ notified_at: new Date().toISOString() }).eq('id', row.id)
  }

  return json({
    ok: true,
    expired: expiredCount,
    promoted_sessions: promotedFor.length,
    pushed
  })
})
