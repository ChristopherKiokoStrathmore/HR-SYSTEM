export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/payroll/runs/[id]/payment-status
 * Get payment status summary and batch details for a payroll run
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await hrApiGet(`/payroll-runs/${id}/payment_status/`)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to fetch payment status:', err)
    return NextResponse.json({ error: 'Failed to fetch payment status' }, { status: 500 })
  }
}
