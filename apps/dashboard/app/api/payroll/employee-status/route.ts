export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

interface RichEmployee {
  id: string
  employee_id: string
  employee_name: string | null
  employee_number: string
  department: string | null
  salary: number | string
  payment_status: string
  payment_method: string
  last_paid_at: string | null
  gross_salary?: number | string
  paye?: number | string
  nssf?: number | string
  nhif?: number | string
  helb?: number | string
  other_deductions?: number | string
  total_deductions?: number | string
  net_salary?: number | string
}

interface RichDept {
  department: string
  total_employees: number
  paid_count: number
  pending_count: number
  status: string
}

const num = (v: unknown): number =>
  typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const params: Record<string, string> = {}
    if (companyId) params.company_id = companyId

    // The Django endpoint resolves employee names (by employee_id) and computes
    // each employee's statutory breakdown for the current month, so we surface
    // gross / PAYE / NSSF / NHIF / HELB / net directly.
    const res = await hrApi<{ data: RichEmployee[]; departments: RichDept[] }>(
      '/employee-payroll-status/with_payment_status/',
      { params }
    )

    const data = (res.data ?? []).map((p) => ({
      id: p.id,
      employee_id: p.employee_id,
      employee_name: p.employee_name ?? null,
      employee_number: p.employee_number,
      department: p.department ?? null,
      salary: num(p.salary),
      gross_salary: num(p.gross_salary ?? p.salary),
      paye: num(p.paye),
      nssf: num(p.nssf),
      nhif: num(p.nhif),
      helb: num(p.helb),
      other_deductions: num(p.other_deductions),
      total_deductions: num(p.total_deductions),
      net_salary: num(p.net_salary ?? p.salary),
      payment_status:
        (p.payment_status as 'pending' | 'processing' | 'paid' | 'failed') || 'pending',
      payment_method: (p.payment_method as 'bank' | 'mpesa' | 'airtel') || 'bank',
      last_paid_at: p.last_paid_at ?? null,
    }))

    const departments = (res.departments ?? []).map((d) => ({
      department: d.department,
      totalEmployees: d.total_employees,
      paidCount: d.paid_count,
      pendingCount: d.pending_count,
      status: (d.status as 'all_paid' | 'partial' | 'none_paid') ?? 'none_paid',
    }))

    return NextResponse.json({ data, departments })
  } catch (err) {
    console.error('[payroll/employee-status] error:', err)
    return NextResponse.json({ data: [], departments: [], error: String(err) }, { status: 500 })
  }
}
