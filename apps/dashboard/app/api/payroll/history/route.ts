export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

interface DRFList<T> {
  count: number
  results: T[]
}

interface PayrollRun {
  id: string
  period_month: number
  period_year: number
  total_gross: number | null
  total_net: number | null
  status: string
  created_at: string | null
}

interface PaymentHistoryRecord {
  id: string
  employee_id: null
  employee_name: string
  employee_number: string
  department: null
  amount: number
  payment_method: 'bank'
  payment_date: string
  reference: string
  status: 'paid' | 'pending'
  period_month: number
  period_year: number
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const params: Record<string, string | number> = { page_size: 100 }
    if (companyId) params.company_id = companyId

    const res = await hrApi<DRFList<PayrollRun>>('/payroll-runs/', { params })

    const records: PaymentHistoryRecord[] = (res.results ?? []).map((run) => ({
      id: run.id,
      employee_id: null,
      employee_name: `${run.period_year}-${String(run.period_month).padStart(2, '0')} Payroll Run`,
      employee_number: '',
      department: null,
      amount: run.total_net ?? run.total_gross ?? 0,
      payment_method: 'bank' as const,
      payment_date: run.created_at ?? '',
      reference: run.id,
      status: run.status === 'completed' ? 'paid' : 'pending',
      period_month: run.period_month,
      period_year: run.period_year,
    }))

    return NextResponse.json({ data: records })
  } catch (err) {
    console.error('[payroll/history] error:', err)
    return NextResponse.json({ data: [] })
  }
}
