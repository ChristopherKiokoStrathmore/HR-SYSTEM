export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, HRApiError } from '@/lib/hr-api'

/**
 * POST /api/payroll/runs/[id]/calculate
 * Calculate payroll for all active employees in the run's company
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const { id } = await params
    const data = await hrApiPost(`/payroll-runs/${id}/calculate/`)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to calculate payroll:', err)
    return NextResponse.json({ error: 'Failed to calculate payroll' }, { status: 500 })
  }
}
