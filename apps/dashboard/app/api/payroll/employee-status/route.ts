export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

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

interface HRApiResponse {
  data: Array<{
    id: string
    employee_id: string
    employee_name: string
    employee_number: string
    department: string | null
    salary: string | number
    payment_status: string
    payment_method: string
    last_paid_at: string | null
  }>
  departments: Array<{
    department: string
    total_employees: number
    paid_count: number
    pending_count: number
    status: string
  }>
}

/**
 * GET /api/payroll/employee-status
 * Get all employees with their current payment status for payroll
 * Proxies to HR-API: GET /api/employee-payroll-status/with-payment-status/
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    const response = await hrApiGet<HRApiResponse>(
      '/employee-payroll-status/with-payment-status/',
      { company_id: companyId || undefined }
    )

    // Transform response to match expected frontend format
    const employeeSalaryRows: EmployeeSalaryRow[] = response.data.map((emp) => ({
      id: emp.id,
      employee_id: emp.employee_id,
      employee_name: emp.employee_name,
      employee_number: emp.employee_number,
      department: emp.department,
      salary: typeof emp.salary === 'string' ? parseFloat(emp.salary) : emp.salary,
      payment_status: emp.payment_status as 'pending' | 'processing' | 'paid' | 'failed',
      payment_method: emp.payment_method as 'bank' | 'mpesa' | 'airtel',
      last_paid_at: emp.last_paid_at,
    }))

    // Transform department data (snake_case to camelCase)
    const departments: DepartmentPaymentStatus[] = response.departments.map((dept) => ({
      department: dept.department,
      totalEmployees: dept.total_employees,
      paidCount: dept.paid_count,
      pendingCount: dept.pending_count,
      status: dept.status as 'all_paid' | 'partial' | 'none_paid',
    }))

    return NextResponse.json({
      data: employeeSalaryRows,
      departments,
    })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Employee status error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
