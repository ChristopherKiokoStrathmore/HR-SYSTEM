export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface EmployeeSalaryRow {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string
  department: string | null
  salary: number
  payment_status: 'pending' | 'processing' | 'paid' | 'failed'
  payment_method: 'bank' | 'mpesa' | 'airtel'
  last_paid_at: string | null
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
 * Get all employees for payroll and derive a simple department summary.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    const supabase = createServerClient(true)
    const query = supabase
      .from('employee_profiles')
      .select(
        `id, employee_number, salary, department, payment_method, user:users!user_id(full_name)`,
        { count: 'exact' }
      )
      .eq('is_deleted', false)

    if (companyId) {
      query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error fetching employees:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = (data ?? []) as any[]

    const employeeSalaryRows: EmployeeSalaryRow[] = rows.map((r) => ({
      id: r.id,
      employee_id: r.id,
      employee_name: r.user?.full_name ?? '',
      employee_number: r.employee_number,
      department: r.department ?? null,
      salary: typeof r.salary === 'string' ? parseFloat(r.salary) : r.salary ?? 0,
      payment_status: 'pending',
      payment_method: (r.payment_method as 'bank' | 'mpesa' | 'airtel') || 'bank',
      last_paid_at: null,
    }))

    // Build simple department summary
    const deptMap = new Map<string, { total: number; paid: number; pending: number }>()
    for (const e of employeeSalaryRows) {
      const dept = e.department || 'Unspecified'
      const cur = deptMap.get(dept) ?? { total: 0, paid: 0, pending: 0 }
      cur.total += 1
      if (e.payment_status === 'paid') cur.paid += 1
      else cur.pending += 1
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
    console.error('Employee status error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
