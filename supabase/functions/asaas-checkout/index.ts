import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
const ASAAS_URL = 'https://api.asaas.com/v3' // Use https://sandbox.asaas.com/v3 para testes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { planId, studentId, paymentMethod, installments } = await req.json()

    // 1. Buscar dados do usuário e do plano
    const { data: user } = await supabase.from('users').select('*').eq('id', studentId).single()
    const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()

    if (!user || !plan) throw new Error('Usuário ou Plano não encontrado')

    // 2. Criar ou buscar cliente no Asaas
    let customerId = user.asaas_customer_id
    if (!customerId) {
      const customerResp = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.full_name,
          cpfCnpj: user.cpf?.replace(/\D/g, ''),
          email: user.email,
          phone: user.phone?.replace(/\D/g, '')
        })
      })
      const customerData = await customerResp.json()
      customerId = customerData.id
      await supabase.from('users').update({ asaas_customer_id: customerId }).eq('id', user.id)
    }

    // 3. Criar a cobrança
    const paymentResp = await fetch(`${ASAAS_URL}/payments`, {
      method: 'POST',
      headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: customerId,
        billingType: paymentMethod.toUpperCase(), // PIX, BOLETO, CREDIT_CARD
        value: plan.price,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // D+3
        description: `Plano ${plan.name} - Diamond X`,
        installmentCount: paymentMethod === 'credit_card' ? installments : undefined,
        externalReference: studentId
      })
    })

    const paymentData = await paymentResp.json()

    // 4. Salvar registro no student_plans
    await supabase.from('student_plans').insert([{
      student_id: studentId,
      plan_id: planId,
      purchased_by: user.id,
      status: 'pending_payment',
      asaas_payment_id: paymentData.id
    }])

    return new Response(JSON.stringify(paymentData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})