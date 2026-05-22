/**
 * PesaPal Disbursement Edge Function
 *
 * Processes payroll payments via PesaPal API.
 * Supports M-Pesa, Airtel Money, and Bank EFT.
 *
 * Note: For production, you'll need to configure PesaPal credentials
 * and ensure proper error handling and logging.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const PESAPAL_CONSUMER_KEY = Deno.env.get('PESAPAL_CONSUMER_KEY')
const PESAPAL_CONSUMER_SECRET = Deno.env.get('PESAPAL_CONSUMER_SECRET')
const PESAPAL_IPN_ID = Deno.env.get('PESAPAL_IPN_ID')  // Pre-registered IPN ID
const PESAPAL_ENVIRONMENT = Deno.env.get('PESAPAL_ENVIRONMENT') || 'sandbox'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PESAPAL_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
}

interface DisburseRequest {
  batch_id: string
  payroll_run_id: string
  records: Array<{
    id: string
    employee_name: string
    email: string
    phone?: string
    net_salary: number
    payment_method: 'bank' | 'mpesa' | 'airtel'
  }>
}

interface PesaPalAuthResponse {
  token: string
  expiryDate: string
  status: string
  error?: { message: string }
}

interface PesaPalOrderResponse {
  order_tracking_id: string
  merchant_reference: string
  redirect_url: string
  status: string
  error?: { message: string }
}

// Get PesaPal authentication token
async function getPesaPalToken(): Promise<string> {
  const baseUrl = PESAPAL_URLS[PESAPAL_ENVIRONMENT as keyof typeof PESAPAL_URLS]

  const response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
  })

  if (!response.ok) {
    throw new Error(`PesaPal auth failed: ${response.status}`)
  }

  const data: PesaPalAuthResponse = await response.json()

  if (data.error) {
    throw new Error(`PesaPal auth error: ${data.error.message}`)
  }

  return data.token
}

// Submit payment order to PesaPal
async function submitPaymentOrder(
  token: string,
  merchantRef: string,
  amount: number,
  email: string,
  phone: string | undefined,
  description: string
): Promise<PesaPalOrderResponse> {
  const baseUrl = PESAPAL_URLS[PESAPAL_ENVIRONMENT as keyof typeof PESAPAL_URLS]

  const orderRequest = {
    id: merchantRef,
    currency: 'KES',
    amount,
    description,
    callback_url: 'https://hr.sheerlogicltd.com/payroll',  // Where user returns after payment
    notification_id: PESAPAL_IPN_ID,  // Pre-registered IPN ID
    billing_address: {
      email_address: email,
      phone_number: phone,
      country_code: 'KE',
      first_name: description.split(' ')[0],
    },
  }

  const response = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(orderRequest),
  })

  if (!response.ok) {
    throw new Error(`PesaPal order failed: ${response.status}`)
  }

  return response.json()
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  // Check if PesaPal is configured
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    // Demo mode - simulate successful disbursement
    console.log('PesaPal not configured - running in demo mode')

    try {
      const payload: DisburseRequest = await req.json()
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

      // Generate demo references and mark all as paid
      const demoRef = `DEMO-${Date.now()}`

      // Update all records as paid
      for (const record of payload.records) {
        await supabase
          .from('payroll_records')
          .update({
            payment_status: 'paid',
            payment_reference: `${demoRef}-${record.id.slice(0, 8)}`,
            paid_at: new Date().toISOString(),
            pesapal_transaction_id: `DEMO-TXN-${Date.now()}`,
          })
          .eq('id', record.id)
      }

      // Update batch as completed
      await supabase
        .from('payment_batches')
        .update({
          status: 'completed',
          successful_count: payload.records.length,
          failed_count: 0,
          pesapal_reference: demoRef,
          completed_at: new Date().toISOString(),
        })
        .eq('id', payload.batch_id)

      // Update payroll run as completed
      await supabase
        .from('payroll_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', payload.payroll_run_id)

      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          reference: demoRef,
          processed: payload.records.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    } catch (err) {
      return new Response(
        JSON.stringify({ error: String(err), demo: true }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  }

  // Production mode with PesaPal
  try {
    const payload: DisburseRequest = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get PesaPal auth token
    const token = await getPesaPalToken()

    // Update batch to processing
    await supabase
      .from('payment_batches')
      .update({ status: 'processing' })
      .eq('id', payload.batch_id)

    // Process each payment
    const results: Array<{ record_id: string; success: boolean; error?: string; order_id?: string }> = []

    for (const record of payload.records) {
      try {
        // Generate unique merchant reference
        const merchantRef = `SL-${payload.batch_id.slice(0, 8)}-${record.id.slice(0, 8)}`

        // Submit payment order
        const orderResponse = await submitPaymentOrder(
          token,
          merchantRef,
          record.net_salary,
          record.email,
          record.phone,
          `Salary payment for ${record.employee_name}`
        )

        if (orderResponse.error) {
          throw new Error(orderResponse.error.message)
        }

        // Update record with PesaPal order info (status will be updated via IPN)
        await supabase
          .from('payroll_records')
          .update({
            payment_status: 'processing',
            payment_reference: merchantRef,
            pesapal_transaction_id: orderResponse.order_tracking_id,
          })
          .eq('id', record.id)

        results.push({
          record_id: record.id,
          success: true,
          order_id: orderResponse.order_tracking_id,
        })
      } catch (err) {
        // Mark individual payment as failed
        await supabase
          .from('payroll_records')
          .update({
            payment_status: 'failed',
            payment_error: String(err),
          })
          .eq('id', record.id)

        results.push({
          record_id: record.id,
          success: false,
          error: String(err),
        })
      }
    }

    // Calculate final batch status
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const batchStatus = failCount === payload.records.length
      ? 'failed'
      : failCount > 0
        ? 'partial'
        : 'processing'  // Will be set to 'completed' via IPN callbacks

    // Update batch with results
    await supabase
      .from('payment_batches')
      .update({
        status: batchStatus,
        successful_count: successCount,
        failed_count: failCount,
        ...(batchStatus === 'failed' ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq('id', payload.batch_id)

    return new Response(
      JSON.stringify({
        success: true,
        processed: payload.records.length,
        successful: successCount,
        failed: failCount,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('PesaPal disbursement error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
