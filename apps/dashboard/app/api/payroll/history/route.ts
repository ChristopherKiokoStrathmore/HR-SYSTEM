export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

interface PaymentHistoryRecord {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string
  department: string | null
  amount: number
  payment_method: 'bank' | 'mpesa' | 'airtel'
  payment_date: string
  reference: string | null
  status: 'paid' | 'failed'
  period_month: number
  period_year: number
}

interface HRApiHistoryResponse {
  data: Array<{
    id: string
    employee_id: string
    employee_name: string
    employee_number: string
    department: string | null
    amount: string | number
    payment_method: string
    payment_date: string | null
    reference: string | null
    status: string
    period_month: number
    period_year: number
  }>
}

/**
 * GET /api/payroll/history
 * Get payment history records from completed payroll runs
 * Proxies to HR-API: GET /api/payment-history/list-history/
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    const response = await hrApiGet<HRApiHistoryResponse>(
      '/payment-history/list-history/',
      {
        company_id: companyId || undefined,
        limit: 100,
      }
    )

    // Transform response to match expected frontend format
    const historyRecords: PaymentHistoryRecord[] = response.data.map((rec) => ({
      id: rec.id,
      employee_id: rec.employee_id,
      employee_name: rec.employee_name,
      employee_number: rec.employee_number,
      department: rec.department,
      amount: typeof rec.amount === 'string' ? parseFloat(rec.amount) : rec.amount,
      payment_method: rec.payment_method as 'bank' | 'mpesa' | 'airtel',
      payment_date: rec.payment_date || '',
      reference: rec.reference,
      status: rec.status as 'paid' | 'failed',
      period_month: rec.period_month,
      period_year: rec.period_year,
    }))

    return NextResponse.json({ data: historyRecords })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Payment history error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
