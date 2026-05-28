export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiPost } from '@/lib/hr-api'

/**
 * POST /api/intasend/test-payment
 * Test endpoint to send 10 KSH to a test phone number via IntaSend M-Pesa B2C
 * This is for testing purposes only
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      phone = '0720523299',
      amount = 10,
      name = 'Test User'
    } = body

    console.log('[test-payment] Sending test payment:', { phone, amount, name })

    // Call backend IntaSend test endpoint
    const result = await hrApiPost<{
      success: boolean
      tracking_id?: string
      error?: string
      message?: string
      status?: string
      details?: unknown
    }>('/intasend/send-mpesa/', {
      phone,
      amount,
      name,
      reference: `TEST-${Date.now()}`,
      narrative: 'Test Payment'
    })

    console.log('[test-payment] Result:', result)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test payment of KES ${amount} sent to ${phone}`,
        tracking_id: result.tracking_id,
        status: result.status
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Payment failed',
        details: result
      }, { status: 400 })
    }
  } catch (err) {
    console.error('[test-payment] Error:', err)
    return NextResponse.json({
      success: false,
      error: String(err)
    }, { status: 500 })
  }
}
