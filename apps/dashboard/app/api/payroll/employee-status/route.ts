export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

interface DRFList<T> {
  count: number
  results: T[]
}

interface EmployeeProfile {
  id: string
  user_id: string | null
  employee_number: string
  salary: string | null
  department: string | null
  payment_method: string | null
}

interface UserRow {
  id: string
  full_name: string
}

interface EmployeeSalaryRow {
  id: string
  employee_id: string
  employee_name: string | null
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const params: Record<string, string | number> = { page_size: 500 }
    if (companyId) params.company_id = companyId

    const res = await hrApi<DRFList<EmployeeProfile>>('/all-employees/', { params })
    const rows = res.results ?? []

    // Names live on the users table (employee_profiles only has user_id), so
    // resolve user_id → full_name to populate the Employee Name column.
    const usersRes = await hrApi<DRFList<UserRow>>('/users/', { params: { page_size: 500 } })
    const nameMap = new Map((usersRes.results ?? []).map((u) => [u.id, u.full_name]))

    const employeeSalaryRows: EmployeeSalaryRow[] = rows.map((p) => ({
      id: p.id,
      employee_id: p.id,
      employee_name: (p.user_id ? nameMap.get(p.user_id) : null) ?? null,
      employee_number: p.employee_number,
      department: p.department ?? null,
      salary: parseFloat(p.salary ?? '0'),
      payment_status: 'pending' as const,
      payment_method: (p.payment_method as 'bank' | 'mpesa' | 'airtel') || 'bank',
      last_paid_at: null,
    }))

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
    return NextResponse.json({ data: [], departments: [], error: String(err) }, { status: 500 })
  }
}
