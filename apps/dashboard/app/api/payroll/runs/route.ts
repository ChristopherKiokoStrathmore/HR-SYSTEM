export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiGet, hrApiPost, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/payroll/runs
 * List all payroll runs, optionally filtered by company
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const data = await hrApiGet<Array<Record<string, unknown>>>('/payroll-runs/', {
      company_id: companyId || undefined,
    })

    // Add derived fields for UI compatibility
    const enrichedData = (Array.isArray(data) ? data : []).map(run => {
      const periodStart = run.period_start as string
      const date = periodStart ? new Date(periodStart) : new Date()

      // Calculate total_deductions from individual components
      const totalDeductions =
        (Number(run.total_paye) || 0) +
        (Number(run.total_nssf) || 0) +
        (Number(run.total_nhif) || 0) +
        (Number(run.total_housing_levy) || 0) +
        (Number(run.total_helb) || 0)

      return {
        ...run,
        period_month: date.getMonth() + 1,
        period_year: date.getFullYear(),
        total_deductions: totalDeductions,
      }
    })

    return NextResponse.json({ data: enrichedData })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to fetch payroll runs:', err)
    return NextResponse.json({ error: 'Failed to fetch payroll runs' }, { status: 500 })
  }
}

/**
 * POST /api/payroll/runs
 * Create a new payroll run
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const body = await req.json()

    // Map frontend format to Django API format
    const payload: Record<string, unknown> = {
      period_start: body.period_start,
      period_end: body.period_end,
      pay_date: body.pay_date,
      notes: body.notes,
      // If frontend sends period_month/period_year, convert to dates
      ...(body.period_month && body.period_year && !body.period_start
        ? {
            period_start: `${body.period_year}-${String(body.period_month).padStart(2, '0')}-01`,
            period_end: new Date(body.period_year, body.period_month, 0).toISOString().split('T')[0],
          }
        : {}),
    }

    // Include company_id if provided
    if (body.company_id) {
      payload.company_id = body.company_id
    }

    const data = await hrApiPost('/payroll-runs/', payload)

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to create payroll run:', err)
    return NextResponse.json({ error: 'Failed to create payroll run' }, { status: 500 })
  }
}
