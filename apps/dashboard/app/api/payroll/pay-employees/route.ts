export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, hrApiGet, hrApiDelete, HRApiError } from '@/lib/hr-api'

// Payment methods
type PaymentMethodType = 'mpesa' | 'bank' | 'airtel'

// Legacy payment source type for backwards compatibility
type PaymentSourceType = 'mpesa_wallet' | 'bank_wallet'

/**
 * POST /api/payroll/pay-employees
 *
 * Sign-then-disburse policy: this endpoint NO LONGER pays employees directly.
 * It prepares the payroll run (create + calculate for the selected employees)
 * and then SENDS IT TO THE EMPLOYER FOR E-SIGNING via DocuSeal. Money is only
 * released afterwards — from the run detail page — once the run is signed
 * (the Django `disburse` endpoint rejects unsigned runs).
 *
 * The chosen method (mpesa/bank/airtel) still drives which rails the eventual
 * disbursement uses (IntaSend M-Pesa B2C / PesaPal).
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const body = await req.json()
    const { employeeIds, paymentMethod, paymentSource, companyId } = body as {
      employeeIds: string[]
      paymentMethod?: PaymentMethodType
      paymentSource?: PaymentSourceType // Legacy support
      companyId: string
    }

    if (!employeeIds || employeeIds.length === 0) {
      return NextResponse.json({ error: 'No employees selected' }, { status: 400 })
    }
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Determine payment method - support both new and legacy formats
    let method: PaymentMethodType = 'bank'
    if (paymentMethod) {
      method = paymentMethod
    } else if (paymentSource) {
      method = paymentSource === 'mpesa_wallet' ? 'mpesa' : 'bank'
    }
    const validMethods: PaymentMethodType[] = ['bank', 'mpesa', 'airtel']
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid payment method: ${method}. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      )
    }

    // Current period
    const now = new Date()
    const periodMonth = now.getMonth() + 1
    const periodYear = now.getFullYear()

    // Find an existing run for the current period
    type PayrollRunItem = {
      id: string
      status: string
      period_start?: string
      period_month?: number
      period_year?: number
      record_count?: number
    }
    let existingRuns: PayrollRunItem[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await hrApiGet('/payroll-runs/', { company_id: companyId })
    if (response?.results && Array.isArray(response.results)) {
      existingRuns = response.results
    } else if (Array.isArray(response)) {
      existingRuns = response
    }

    const currentPeriodRun = existingRuns.find((run) => {
      if (run.period_month !== undefined && run.period_year !== undefined) {
        return run.period_month === periodMonth && run.period_year === periodYear
      }
      if (run.period_start) {
        const d = new Date(run.period_start)
        return d.getMonth() + 1 === periodMonth && d.getFullYear() === periodYear
      }
      return false
    })

    const isRunUsable =
      currentPeriodRun &&
      (currentPeriodRun.status === 'draft' ||
        (currentPeriodRun.record_count && currentPeriodRun.record_count > 0))

    let payrollRunId: string | null = null

    if (currentPeriodRun && !isRunUsable) {
      // Empty, non-draft run — remove so we can rebuild it cleanly
      try {
        await hrApiDelete(`/payroll-runs/${currentPeriodRun.id}/`)
      } catch {
        /* non-fatal */
      }
    }

    if (isRunUsable) {
      payrollRunId = currentPeriodRun!.id
      if (currentPeriodRun!.status === 'draft') {
        await hrApiPost(`/payroll-runs/${payrollRunId}/calculate/`, {
          company_id: companyId,
          employee_ids: employeeIds,
        })
      }
    } else {
      // Create + calculate a fresh run
      try {
        const newRun = await hrApiPost<{ id: string }>('/payroll-runs/', {
          company_id: companyId,
          period_month: periodMonth,
          period_year: periodYear,
        })
        payrollRunId = newRun.id
      } catch (err) {
        const errStr = String(err)
        if (errStr.includes('already exists')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const refetch: any = await hrApiGet('/payroll-runs/', {
            company_id: companyId,
            period_month: periodMonth,
            period_year: periodYear,
          })
          const runs = refetch?.results || refetch || []
          const existing = runs.find(
            (r: { period_month?: number; period_year?: number }) =>
              r.period_month === periodMonth && r.period_year === periodYear
          )
          if (!existing) throw err
          payrollRunId = existing.id
        } else {
          throw err
        }
      }
      await hrApiPost(`/payroll-runs/${payrollRunId}/calculate/`, {
        company_id: companyId,
        employee_ids: employeeIds,
      })
    }

    // Send the calculated run to the employer for e-signing (DocuSeal).
    // Disbursement is enabled only after the employer signs.
    const submitResult = await hrApiPost<{
      status?: string
      approvers_notified?: number
      required_approvals?: number
    }>(`/payroll-workflow/${payrollRunId}/submit/`, {})

    return NextResponse.json({
      success: true,
      submittedForSigning: true,
      runId: payrollRunId,
      paymentMethod: method,
      reference: `SIGN-${Date.now()}`,
      message:
        `Sent to the employer for signing — ${submitResult.approvers_notified ?? 0} ` +
        `approver(s) notified. Money is released after signing.`,
    })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json(
        { error: err.message, details: err.data, status: err.status },
        { status: err.status }
      )
    }
    console.error('Pay employees (send-for-signing) error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
