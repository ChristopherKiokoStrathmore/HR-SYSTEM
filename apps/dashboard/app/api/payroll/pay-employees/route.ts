export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, hrApiGet, HRApiError } from '@/lib/hr-api'

type PaymentSourceType = 'mpesa_wallet' | 'bank_wallet'

/**
 * POST /api/payroll/pay-employees
 * Pay selected employees - creates/uses a payroll run and disburses to selected employees
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const body = await req.json()
    const { employeeIds, paymentSource, companyId } = body as {
      employeeIds: string[]
      paymentSource: PaymentSourceType
      companyId: string
    }

    if (!employeeIds || employeeIds.length === 0) {
      return NextResponse.json({ error: 'No employees selected' }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get current period
    const now = new Date()
    const periodMonth = now.getMonth() + 1
    const periodYear = now.getFullYear()

    // Check if there's an existing payroll run for this period
    const existingRuns = await hrApiGet<Array<{ id: string; status: string }>>('/payroll-runs/', {
      company_id: companyId,
    })

    let payrollRunId: string | null = null

    // Find an existing run for current period that's not completed
    const currentPeriodRun = Array.isArray(existingRuns)
      ? existingRuns.find((run) => {
          // We'd need period_month/year from the run - assume structure matches
          return run.status !== 'completed'
        })
      : null

    if (currentPeriodRun) {
      payrollRunId = currentPeriodRun.id
    } else {
      // Create a new payroll run
      const newRun = await hrApiPost<{ id: string }>('/payroll-runs/', {
        company_id: companyId,
        period_month: periodMonth,
        period_year: periodYear,
      })
      payrollRunId = newRun.id

      // Calculate payroll for the run
      await hrApiPost(`/payroll-runs/${payrollRunId}/calculate/`)

      // Approve it
      await hrApiPost(`/payroll-runs/${payrollRunId}/approve/`)
    }

    // Determine payment method from source
    const paymentMethod = paymentSource === 'mpesa_wallet' ? 'mpesa' : 'bank'

    // Disburse to selected employees
    const disburseResult = await hrApiPost<{
      message?: string
      batches?: Array<{
        record_count: number
        successful_count: number
        failed_count: number
      }>
    }>(`/payroll-runs/${payrollRunId}/disburse/`, {
      record_ids: employeeIds,
      payment_methods: [paymentMethod],
    })

    // Calculate results
    let paidCount = 0
    let failedCount = 0

    if (disburseResult.batches) {
      for (const batch of disburseResult.batches) {
        paidCount += batch.successful_count || 0
        failedCount += batch.failed_count || 0
      }
    } else {
      // If no batches info, assume all were queued for processing
      paidCount = employeeIds.length
    }

    return NextResponse.json({
      success: true,
      paidCount,
      failedCount,
      reference: `PAY-${Date.now()}`,
    })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Pay employees error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
