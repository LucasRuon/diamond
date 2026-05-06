import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedRoles = new Set(['student', 'responsible', 'businessman', 'admin'])
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authorization = req.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: 'Configuracao do servidor incompleta.' }, 500)
    }

    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse({ error: 'Autenticacao obrigatoria.' }, 401)
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authorization },
      },
    })

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: authData, error: authError } = await userClient.auth.getUser()
    const caller = authData?.user

    if (authError || !caller) {
      return jsonResponse({ error: 'Autenticacao invalida.' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfileError || callerProfile?.role !== 'admin') {
      return jsonResponse({ error: 'Permissao de administrador obrigatoria.' }, 403)
    }

    const payload = await req.json().catch(() => null)

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return jsonResponse({ error: 'Payload invalido.' }, 400)
    }

    const { userId, full_name, role } = payload as {
      userId?: unknown
      full_name?: unknown
      role?: unknown
    }

    if (typeof userId !== 'string' || !uuidRegex.test(userId)) {
      return jsonResponse({ error: 'Usuario alvo invalido.' }, 400)
    }

    if (typeof role !== 'string' || !allowedRoles.has(role)) {
      return jsonResponse({ error: 'Papel de usuario invalido.' }, 400)
    }

    if (typeof full_name !== 'string' || !full_name.trim()) {
      return jsonResponse({ error: 'Informe o nome completo.' }, 400)
    }

    const fullName = full_name.trim()
    const cpf = normalizeOptionalText((payload as { cpf?: unknown }).cpf)
    const phone = normalizeOptionalText((payload as { phone?: unknown }).phone)

    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({
        full_name: fullName,
        role,
        cpf,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, email, full_name, role, cpf, phone, updated_at')
      .single()

    if (updateError || !updatedUser) {
      return jsonResponse({ error: 'Nao foi possivel atualizar o usuario.' }, 400)
    }

    let metadataWarning: string | null = null
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: fullName,
        role,
        cpf,
        phone,
      },
    })

    if (metadataError) {
      metadataWarning = 'Usuario atualizado, mas os metadados do Auth nao foram sincronizados.'
      console.warn('Auth metadata sync failed for admin-update-user:', metadataError.message)
    }

    return jsonResponse({ user: updatedUser, metadataWarning })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado.'
    console.error('admin-update-user failed:', message)
    return jsonResponse({ error: 'Nao foi possivel atualizar o usuario.' }, 500)
  }
})
