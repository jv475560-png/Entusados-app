// ENTUSADOS · Bre-B / bank webhook
// Despliegue: supabase functions deploy bre-b-webhook --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BRE_B_WEBHOOK_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface BreBPayload {
  provider?: 'bre_b' | 'nequi' | 'daviplata' | 'bancolombia'
  amount?: number
  reference?: string
  order_code?: string
  sender_name?: string
  transaction_id?: string
  [key: string]: unknown
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const secret = Deno.env.get('BRE_B_WEBHOOK_SECRET')
  if (secret && request.headers.get('x-bre-b-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let payload: BreBPayload
  try {
    payload = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const amount = Number(payload.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return new Response(JSON.stringify({ error: 'Invalid amount' }), { status: 422 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  )

  const { data, error } = await supabase
    .from('payment_notifications')
    .insert({
      provider: payload.provider ?? 'bre_b',
      amount,
      reference: payload.reference ?? payload.order_code ?? payload.transaction_id ?? null,
      order_code: payload.order_code ?? payload.reference ?? null,
      sender_name: payload.sender_name ?? null,
      raw_payload: payload,
    })
    .select('*')
    .single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, notification: data }), {
    headers: { 'Content-Type': 'application/json' },
    status: 201,
  })
})
