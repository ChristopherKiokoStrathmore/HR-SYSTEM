export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined

  const { data: employees, error } = await djangoGet('/all-employees/', {
    companyId,
    page_size: 200,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })

  const rows = (employees as Array<Record<string, unknown>>) ?? []
  const employeeSalaryRows = rows.map(r => ({
    id: r.id,
    employee_id: r.id,
    employee_name: '',
    employee_number: r.employee_number,
    department: r.department ?? null,
    salary: typeof r.salary === 'string' ? parseFloat(r.salary as string) : (r.salary ?? 0),
    payment_status: 'pending',
    payment_method: r.payment_method ?? 'bank',
    last_paid_at: null,
  }))

  const deptMap = new Map<string, { total: number; paid: number; pending: number }>()
  for (const e of employeeSalaryRows) {
    const dept = (e.department as string) || 'Unspecified'
    const cur = deptMap.get(dept) ?? { total: 0, paid: 0, pending: 0 }
    cur.total += 1
    cur.pending += 1
    deptMap.set(dept, cur)
  }

  const departments = Array.from(deptMap.entries()).map(([department, v]) => ({
    department, totalEmployees: v.total, paidCount: v.paid, pendingCount: v.pending, status: 'none_paid',
  }))

  return NextResponse.json({ data: employeeSalaryRows, departments })
}
