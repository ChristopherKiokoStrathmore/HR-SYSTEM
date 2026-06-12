export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, HRApiError } from '@/lib/hr-api'

/**
 * POST /api/payroll/disburse
 *
 * Initiates payroll disbursement through the Django backend.
 * - M-Pesa payments are processed via IntaSend B2C
 * - Bank and Airtel payments are processed via PesaPal
 *
 * Body: {
 *   runId: string,
 *   method?: 'bank' | 'mpesa' | 'airtel' | 'all',
 *   recordIds?: string[]  // optional: disburse specific records only
 * }
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const body = await req.json()
    const { runId, method = 'all', recordIds } = body as {
      runId: string
      method?: 'bank' | 'mpesa' | 'airtel' | 'all'
      recordIds?: string[]
    }

    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    // Build the payload for Django API
    const payload: Record<string, unknown> = {}

    if (recordIds && recordIds.length > 0) {
      payload.record_ids = recordIds
    }

    if (method !== 'all') {
      payload.payment_methods = [method]
    }

    // Call Django API to disburse
    const data = await hrApiPost<{
      message?: string
      batches?: Array<{
        id: string
        payment_method: string
        status: string
        record_count: number
        successful_count: number
        failed_count: number
      }>
    }>(`/payroll-runs/${runId}/disburse/`, payload)

    // Transform batches to frontend format
    const batches = (data.batches || []).map(b => ({
      method: b.payment_method,
      success: b.status !== 'failed',
      processed: b.record_count,
    }))

    const totalProcessed = batches.reduce((sum, b) => sum + (b.processed || 0), 0)

    return NextResponse.json({
      success: true,
      data,
      batches,
      totalProcessed,
      demo: false,
      reference: `SL-${Date.now()}`,
    })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Disbursement error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
