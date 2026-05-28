export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, hrApiGet, hrApiDelete, HRApiError } from '@/lib/hr-api'

// Payment methods
type PaymentMethodType = 'mpesa' | 'bank' | 'airtel'

// Legacy payment source type for backwards compatibility
type PaymentSourceType = 'mpesa_wallet' | 'bank_wallet'

// Test mode configuration - for development/testing only
const TEST_MODE = true // Set to false for production
const TEST_PHONE = '0720523299'
const TEST_AMOUNT = 10 // KES

/**
 * POST /api/payroll/pay-employees
 * Pay selected employees - creates/uses a payroll run and disburses to selected employees
 *
 * Supports three payment methods:
 * - mpesa: M-Pesa B2C via IntaSend (primary provider for M-Pesa)
 * - bank: Bank EFT transfer via PesaPal
 * - airtel: Airtel Money via PesaPal
 *
 * TEST MODE: When TEST_MODE is true and payment method is M-Pesa,
 * sends 10 KSH to test phone number instead of actual employee payments.
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
      // Legacy support: convert old payment source to new method
      method = paymentSource === 'mpesa_wallet' ? 'mpesa' : 'bank'
    }

    // Validate payment method
    const validMethods: PaymentMethodType[] = ['bank', 'mpesa', 'airtel']
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: `Invalid payment method: ${method}. Must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      )
    }

    // TEST MODE: For M-Pesa, send test payment instead of actual salaries
    // This bypasses all payroll run logic and sends directly via IntaSend
    if (TEST_MODE && method === 'mpesa') {
      console.log('[pay-employees] TEST MODE: Sending test payment of', TEST_AMOUNT, 'KES to', TEST_PHONE)

      try {
        const testResult = await hrApiPost<{
          success: boolean
          tracking_id?: string
          error?: string
          message?: string
        }>('/intasend/send-mpesa/', {
          phone: TEST_PHONE,
          amount: TEST_AMOUNT,
          name: 'Test Payment',
          reference: `TEST-${Date.now()}`,
          narrative: `Test payment for ${employeeIds.length} employees`
        })

        console.log('[pay-employees] Test payment result:', testResult)

        if (testResult.success) {
          return NextResponse.json({
            success: true,
            paidCount: employeeIds.length,
            failedCount: 0,
            paymentMethod: method,
            reference: testResult.tracking_id || `TEST-${Date.now()}`,
            testMode: true,
            message: `TEST MODE: Sent KES ${TEST_AMOUNT} to ${TEST_PHONE} (representing ${employeeIds.length} employee payments)`,
          })
        } else {
          return NextResponse.json({
            success: false,
            error: testResult.error || 'Test payment failed',
            testMode: true,
          }, { status: 400 })
        }
      } catch (testErr) {
        console.error('[pay-employees] Test payment error:', testErr)
        return NextResponse.json({
          success: false,
          error: String(testErr),
          testMode: true,
        }, { status: 500 })
      }
    }

    // Get current period
    const now = new Date()
    const periodMonth = now.getMonth() + 1
    const periodYear = now.getFullYear()

    console.log('[pay-employees] Fetching payroll runs for company:', companyId)

    // Check if there's an existing payroll run for this period
    type PayrollRunItem = { id: string; status: string; period_start?: string; period_month?: number; period_year?: number }
    let existingRuns: PayrollRunItem[] = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await hrApiGet('/payroll-runs/', {
        company_id: companyId,
      })
      console.log('[pay-employees] API response type:', typeof response, 'isArray:', Array.isArray(response))

      // Handle Django paginated response format: { count, next, previous, results: [...] }
      if (response && response.results && Array.isArray(response.results)) {
        existingRuns = response.results
        console.log('[pay-employees] Extracted from results:', existingRuns.length, 'runs')
      } else if (Array.isArray(response)) {
        existingRuns = response
        console.log('[pay-employees] Response is array:', existingRuns.length, 'runs')
      }

      console.log('[pay-employees] Looking for period:', periodMonth, '/', periodYear)
      existingRuns.forEach((run, i) => {
        console.log(`[pay-employees] Run ${i}:`, run.id, 'period_month:', run.period_month, 'period_year:', run.period_year, 'status:', run.status)
      })
    } catch (err) {
      console.error('[pay-employees] Failed to fetch payroll runs:', err)
      throw err
    }

    let payrollRunId: string | null = null

    // Find an existing run for current period - check period_month/period_year first (Django returns these)
    type PayrollRunWithRecords = PayrollRunItem & { record_count?: number }
    const currentPeriodRun = (existingRuns as PayrollRunWithRecords[]).find((run) => {
      // Django API returns period_month and period_year directly
      if (run.period_month !== undefined && run.period_year !== undefined) {
        const matches = run.period_month === periodMonth && run.period_year === periodYear
        console.log('[pay-employees] Comparing:', run.period_month, '/', run.period_year, 'vs', periodMonth, '/', periodYear, '=', matches, 'record_count:', run.record_count)
        return matches
      }
      // Fallback: parse period from period_start date string
      if (run.period_start) {
        const periodDate = new Date(run.period_start)
        const runMonth = periodDate.getMonth() + 1
        const runYear = periodDate.getFullYear()
        return runMonth === periodMonth && runYear === periodYear
      }
      return false
    }) as PayrollRunWithRecords | undefined

    // Check if the existing run is usable (has records or is still in draft)
    const isRunUsable = currentPeriodRun && (
      currentPeriodRun.status === 'draft' ||
      (currentPeriodRun.record_count && currentPeriodRun.record_count > 0)
    )

    if (currentPeriodRun && !isRunUsable) {
      // The existing run is empty and not in draft - delete it and create a new one
      console.log('[pay-employees] Existing run is empty and not draft, deleting:', currentPeriodRun.id)
      try {
        await hrApiDelete(`/payroll-runs/${currentPeriodRun.id}/`)
        console.log('[pay-employees] Deleted empty payroll run')
      } catch (err) {
        console.log('[pay-employees] Failed to delete empty run (continuing anyway):', err)
      }
    }

    if (isRunUsable) {
      payrollRunId = currentPeriodRun!.id
      console.log('[pay-employees] Using existing payroll run:', payrollRunId, 'status:', currentPeriodRun!.status, 'record_count:', currentPeriodRun!.record_count)

      // If the run is in draft, we need to calculate
      if (currentPeriodRun!.status === 'draft') {
        console.log('[pay-employees] Calculating payroll run for employees:', employeeIds)
        try {
          await hrApiPost(`/payroll-runs/${payrollRunId}/calculate/`, {
            company_id: companyId,
            employee_ids: employeeIds,
          })
          console.log('[pay-employees] Payroll calculated')
        } catch (err) {
          console.log('[pay-employees] Calculate failed:', err)
        }
      }

      // Approve if needed
      if (currentPeriodRun!.status === 'draft' || currentPeriodRun!.status === 'calculated') {
        console.log('[pay-employees] Approving payroll run')
        try {
          await hrApiPost(`/payroll-runs/${payrollRunId}/approve/`, { company_id: companyId })
        } catch (err) {
          console.log('[pay-employees] Approve failed (may already be approved):', err)
        }
      }
    } else {
      console.log('[pay-employees] Step 2: Creating new payroll run')
      // Create a new payroll run
      try {
        const newRun = await hrApiPost<{ id: string }>('/payroll-runs/', {
          company_id: companyId,
          period_month: periodMonth,
          period_year: periodYear,
        })
        payrollRunId = newRun.id
        console.log('[pay-employees] Created payroll run:', payrollRunId)
      } catch (err) {
        // Check if error is "payroll run already exists"
        const errStr = String(err)
        if (errStr.includes('already exists') || errStr.includes('A payroll run already exists')) {
          console.log('[pay-employees] Payroll run already exists, fetching it...')
          // Re-fetch and find the existing run
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const refetchResponse: any = await hrApiGet('/payroll-runs/', {
              company_id: companyId,
              period_month: periodMonth,
              period_year: periodYear,
            })
            const refetchedRuns = refetchResponse?.results || refetchResponse || []
            const existingRun = refetchedRuns.find((r: { period_month?: number; period_year?: number }) =>
              r.period_month === periodMonth && r.period_year === periodYear
            )
            if (existingRun) {
              payrollRunId = existingRun.id
              console.log('[pay-employees] Found existing payroll run:', payrollRunId)
            } else {
              console.error('[pay-employees] Could not find existing payroll run after error')
              throw err
            }
          } catch (refetchErr) {
            console.error('[pay-employees] Failed to refetch payroll runs:', refetchErr)
            throw err
          }
        } else {
          console.error('[pay-employees] Failed to create payroll run:', err)
          throw err
        }
      }

      console.log('[pay-employees] Step 3: Calculating payroll for employees:', employeeIds)
      // Calculate payroll for the run
      try {
        await hrApiPost(`/payroll-runs/${payrollRunId}/calculate/`, {
          company_id: companyId,
          employee_ids: employeeIds,
        })
        console.log('[pay-employees] Payroll calculated')
      } catch (err) {
        console.error('[pay-employees] Failed to calculate payroll:', err)
        throw err
      }

      console.log('[pay-employees] Step 4: Approving payroll')
      // Approve it
      try {
        await hrApiPost(`/payroll-runs/${payrollRunId}/approve/`, { company_id: companyId })
        console.log('[pay-employees] Payroll approved')
      } catch (err) {
        console.error('[pay-employees] Failed to approve payroll:', err)
        throw err
      }
    }

    console.log('[pay-employees] Step 5: Disbursing to employees:', employeeIds.length, 'via', method)

    // Disburse to selected employees using PesaPal payment method
    let disburseResult: {
      message?: string
      batches?: Array<{
        payment_method: string
        batch_id?: string
        record_count: number
        successful_count: number
        failed_count: number
      }>
      total_records?: number
      total_successful?: number
      total_failed?: number
    }
    try {
      disburseResult = await hrApiPost(`/payroll-runs/${payrollRunId}/disburse/`, {
        company_id: companyId,
        employee_ids: employeeIds,
        payment_methods: [method],
      })
      console.log('[pay-employees] Disburse result:', JSON.stringify(disburseResult))
    } catch (err) {
      console.error('[pay-employees] Failed to disburse:', err)
      throw err
    }

    // Calculate results
    let paidCount = 0
    let failedCount = 0
    let batchId: string | undefined

    if (disburseResult.batches) {
      for (const batch of disburseResult.batches) {
        paidCount += batch.successful_count || 0
        failedCount += batch.failed_count || 0
        if (batch.batch_id) {
          batchId = batch.batch_id
        }
      }
    } else if (disburseResult.total_successful !== undefined) {
      paidCount = disburseResult.total_successful
      failedCount = disburseResult.total_failed || 0
    } else {
      // If no detailed info, assume all were queued for processing
      paidCount = employeeIds.length
    }

    return NextResponse.json({
      success: true,
      paidCount,
      failedCount,
      paymentMethod: method,
      reference: `PAY-${Date.now()}`,
      batchId, // Include PesaPal batch ID if available
      message: `Payment initiated for ${paidCount} employee(s) via ${method.toUpperCase()}`,
    })
  } catch (err) {
    if (err instanceof HRApiError) {
      console.error('HR API Error:', err.message, 'Status:', err.status, 'Data:', JSON.stringify(err.data))
      return NextResponse.json({
        error: err.message,
        details: err.data,
        status: err.status
      }, { status: err.status })
    }
    console.error('Pay employees error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
