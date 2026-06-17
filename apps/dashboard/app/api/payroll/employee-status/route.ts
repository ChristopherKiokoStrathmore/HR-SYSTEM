export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

interface DRFList<T> {
  count: number
  results: T[]
}

interface EmployeeProfile {
  id: string
  employee_number: string
  salary: string | null
  department: string | null
  payment_method: string | null
}

interface EmployeeSalaryRow {
  id: string
  employee_id: string
  employee_name: null
  employee_number: string
  department: string | null
  salary: number
  payment_status: 'pending'
  payment_method: 'bank' | 'mpesa' | 'airtel'
  last_paid_at: null
}

interface DepartmentPaymentStatus {
  department: string
  totalEmployees: number
  paidCount: number
  pendingCount: number
  status: 'all_paid' | 'partial' | 'none_paid'
}

/**
 * GET /api/payroll/employee-status
 * Fetches all employees from Django and returns payroll-ready rows.
 * All payment_status values default to 'pending' (no payroll_records endpoint yet).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  const params: Record<string, string | number> = { page_size: 500 }
  if (companyId) params.company_id = companyId

  try {
    const res = await hrApi<DRFList<EmployeeProfile>>('/all-employees/', { params })

    const rows = res.results ?? []

    const employeeSalaryRows: EmployeeSalaryRow[] = rows.map((p) => ({
      id: p.id,
      employee_id: p.id,
      employee_name: null,
      employee_number: p.employee_number,
      department: p.department ?? null,
      salary: parseFloat(p.salary ?? '0'),
      payment_status: 'pending' as const,
      payment_method: (p.payment_method as 'bank' | 'mpesa' | 'airtel') || 'bank',
      last_paid_at: null,
    }))

    // Build department summary — all pending since we have no payroll_records data
    const deptMap = new Map<string, { total: number; paid: number; pending: number }>()
    for (const e of employeeSalaryRows) {
      const dept = e.department || 'Unspecified'
      const cur = deptMap.get(dept) ?? { total: 0, paid: 0, pending: 0 }
      cur.total += 1
      cur.pending += 1
      deptMap.set(dept, cur)
    }

    const departments: DepartmentPaymentStatus[] = Array.from(deptMap.entries()).map(([department, v]) => ({
      department,
      totalEmployees: v.total,
      paidCount: v.paid,
      pendingCount: v.pending,
      status: v.paid === v.total ? 'all_paid' : v.paid === 0 ? 'none_paid' : 'partial',
    }))

    return NextResponse.json({ data: employeeSalaryRows, departments })
  } catch (err) {
    console.error('[payroll/employee-status] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
