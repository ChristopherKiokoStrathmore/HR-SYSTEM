export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/pesapal/transaction-status
 * Check status of a specific payment transaction
 *
 * Query params:
 *   order_tracking_id: string - PesaPal order tracking ID
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderTrackingId = searchParams.get('order_tracking_id')

    if (!orderTrackingId) {
      return NextResponse.json({ error: 'order_tracking_id required' }, { status: 400 })
    }

    const data = await hrApiGet('/pesapal/transaction_status/', {
      order_tracking_id: orderTrackingId,
    })
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to get transaction status:', err)
    return NextResponse.json({ error: 'Failed to get transaction status' }, { status: 500 })
  }
}
