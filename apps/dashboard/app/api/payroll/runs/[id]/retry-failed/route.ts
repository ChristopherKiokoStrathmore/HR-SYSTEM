export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, HRApiError } from '@/lib/hr-api'

/**
 * POST /api/payroll/runs/[id]/retry-failed
 * Retry failed payments in the payroll run
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const { id } = await params
    const data = await hrApiPost(`/payroll-runs/${id}/retry_failed/`)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to retry payments:', err)
    return NextResponse.json({ error: 'Failed to retry payments' }, { status: 500 })
  }
}
