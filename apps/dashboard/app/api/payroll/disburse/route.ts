export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, HRApiError } from '@/lib/hr-api'

/**
 * POST /api/payroll/disburse
 *
 * Initiates payroll disbursement via PesaPal through the Django backend.
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
    const data = await hrApiPost(`/payroll-runs/${runId}/disburse/`, payload)

    return NextResponse.json({
      success: true,
      data,
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
