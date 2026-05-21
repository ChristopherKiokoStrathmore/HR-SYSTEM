/**
 * PesaPal IPN (Instant Payment Notification) Webhook Handler
 *
 * Receives payment status updates from PesaPal and updates
 * the corresponding payroll records and payment batches.
 *
 * PesaPal sends IPN callbacks when payment status changes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const PESAPAL_CONSUMER_KEY = Deno.env.get('PESAPAL_CONSUMER_KEY')
const PESAPAL_CONSUMER_SECRET = Deno.env.get('PESAPAL_CONSUMER_SECRET')
const PESAPAL_ENVIRONMENT = Deno.env.get('PESAPAL_ENVIRONMENT') || 'sandbox'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const PESAPAL_URLS = {
  sandbox: 'https://cybqa.pesapal.com/pesapalv3',
  live: 'https://pay.pesapal.com/v3',
}

// PesaPal status codes
const PESAPAL_STATUS = {
  PENDING: '0',
  COMPLETED: '1',
  FAILED: '2',
  REVERSED: '3',
}

interface IPNPayload {
  OrderTrackingId: string
  OrderMerchantReference: string
  OrderNotificationType: string
}

interface TransactionStatus {
  payment_method: string
  amount: number
  created_date: string
  confirmation_code: string
  payment_status_description: string
  description: string
  message: string
  payment_account: string
  status_code: string
  merchant_reference: string
  payment_status_code: string
  currency: string
  error?: { message: string }
  status: string
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

  const data = await response.json()
  return data.token
}

// Get transaction status from PesaPal
async function getTransactionStatus(token: string, orderTrackingId: string): Promise<TransactionStatus> {
  const baseUrl = PESAPAL_URLS[PESAPAL_ENVIRONMENT as keyof typeof PESAPAL_URLS]

  const response = await fetch(
    `${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`PesaPal status check failed: ${response.status}`)
  }

  return response.json()
}

// Map PesaPal status to our payment status
function mapPaymentStatus(statusCode: string): 'pending' | 'processing' | 'paid' | 'failed' {
  switch (statusCode) {
    case PESAPAL_STATUS.COMPLETED:
      return 'paid'
    case PESAPAL_STATUS.FAILED:
    case PESAPAL_STATUS.REVERSED:
      return 'failed'
    case PESAPAL_STATUS.PENDING:
    default:
      return 'processing'
  }
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

  // Accept both GET and POST (PesaPal can use either)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    let ipnPayload: IPNPayload

    // Parse IPN payload from either GET params or POST body
    if (req.method === 'GET') {
      const url = new URL(req.url)
      ipnPayload = {
        OrderTrackingId: url.searchParams.get('OrderTrackingId') || '',
        OrderMerchantReference: url.searchParams.get('OrderMerchantReference') || '',
        OrderNotificationType: url.searchParams.get('OrderNotificationType') || '',
      }
    } else {
      ipnPayload = await req.json()
    }

    console.log('Received IPN:', ipnPayload)

    // Validate payload
    if (!ipnPayload.OrderTrackingId || !ipnPayload.OrderMerchantReference) {
      return new Response(
        JSON.stringify({ error: 'Invalid IPN payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the IPN for audit
    await supabase
      .from('pesapal_ipn_logs')
      .insert({
        order_tracking_id: ipnPayload.OrderTrackingId,
        order_merchant_reference: ipnPayload.OrderMerchantReference,
        order_notification_type: ipnPayload.OrderNotificationType,
        raw_payload: ipnPayload,
      })

    // Get transaction status from PesaPal
    let transactionStatus: TransactionStatus | null = null

    if (PESAPAL_CONSUMER_KEY && PESAPAL_CONSUMER_SECRET) {
      try {
        const token = await getPesaPalToken()
        transactionStatus = await getTransactionStatus(token, ipnPayload.OrderTrackingId)
        console.log('Transaction status:', transactionStatus)
      } catch (err) {
        console.error('Failed to get transaction status:', err)
      }
    }

    // Find the payroll record by PesaPal transaction ID
    const { data: record, error: recordError } = await supabase
      .from('payroll_records')
      .select('id, payment_batch_id, payment_status')
      .eq('pesapal_transaction_id', ipnPayload.OrderTrackingId)
      .single()

    if (recordError || !record) {
      console.log('Record not found for tracking ID:', ipnPayload.OrderTrackingId)
      // Still return success to PesaPal to stop retries
      return new Response(
        JSON.stringify({ status: 'ok', message: 'Record not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine payment status
    const paymentStatus = transactionStatus
      ? mapPaymentStatus(transactionStatus.status_code)
      : 'processing'  // Default if we can't get status

    // Only update if status has changed and is final
    if (paymentStatus !== record.payment_status && (paymentStatus === 'paid' || paymentStatus === 'failed')) {
      // Update payroll record
      await supabase
        .from('payroll_records')
        .update({
          payment_status: paymentStatus,
          paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
          payment_reference: transactionStatus?.confirmation_code || ipnPayload.OrderMerchantReference,
          payment_error: paymentStatus === 'failed' ? transactionStatus?.message : null,
        })
        .eq('id', record.id)

      console.log(`Updated record ${record.id} to status: ${paymentStatus}`)

      // The database trigger will automatically update the batch status
    }

    // Mark IPN as processed
    await supabase
      .from('pesapal_ipn_logs')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        payment_status_code: transactionStatus?.status_code,
        payment_status_description: transactionStatus?.payment_status_description,
      })
      .eq('order_tracking_id', ipnPayload.OrderTrackingId)
      .eq('processed', false)

    // Return success response to PesaPal
    // PesaPal expects a specific response format
    return new Response(
      JSON.stringify({
        status: '200',
        message: 'IPN received and processed',
        orderTrackingId: ipnPayload.OrderTrackingId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('IPN processing error:', err)

    // Log the error but still return success to prevent retries
    try {
      await supabase
        .from('pesapal_ipn_logs')
        .update({
          processing_error: String(err),
        })
        .eq('processed', false)
    } catch (logErr) {
      console.error('Failed to log error:', logErr)
    }

    return new Response(
      JSON.stringify({ status: '200', message: 'Received with errors' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
