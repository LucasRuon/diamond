import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authorization = req.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Config incompleta.' }, 500)
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Autenticacao obrigatoria.' }, 401)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
    })

    const { data: authData, error: authError } = await userClient.auth.getUser()
    if (authError || !authData?.user) return json({ error: 'Sessao invalida.' }, 401)
    const userId = authData.user.id

    const body = await req.json().catch(() => null) as
      | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
      | null
    const endpoint = body?.endpoint
    const p256dh = body?.keys?.p256dh
    const auth = body?.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return json({ error: 'Subscription invalida.' }, 400)
    }

    const { error } = await userClient
      .from('push_subscriptions')
      .upsert(
        { user_id: userId, endpoint, p256dh, auth },
        { onConflict: 'user_id,endpoint' }
      )

    if (error) return json({ error: error.message }, 400)
    return json({ ok: true })
  } catch (err) {
    return json({ error: String(err?.message || err) }, 500)
  }
})
