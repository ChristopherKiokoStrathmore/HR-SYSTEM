export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/intasend/transaction-status
 * Check status of a specific IntaSend M-Pesa transaction
 *
 * Query params:
 * - tracking_id: IntaSend transaction tracking ID
 */
export async function GET(req: NextRequest) {
  const trackingId = req.nextUrl.searchParams.get('tracking_id')

  if (!trackingId) {
    return NextResponse.json({ error: 'tracking_id is required' }, { status: 400 })
  }

  try {
    const data = await hrApiGet<{
      success: boolean
      status: string
      tracking_id: string
      amount?: number
      phone?: string
      reference?: string
      message?: string
    }>('/intasend/transaction_status/', { tracking_id: trackingId })
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to get IntaSend transaction status:', err)
    return NextResponse.json({ error: 'Failed to get transaction status' }, { status: 500 })
  }
}
