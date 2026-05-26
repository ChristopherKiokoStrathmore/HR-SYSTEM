export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface EmployeeRow {
  department: string | null
  employment_type: string
  employment_status: string
  start_date: string
  gender: string | null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const supabase = createServerClient(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hcQuery = (supabase.from('employee_profiles') as any)
    .select('department, employment_type, employment_status, start_date, gender')
    .eq('is_deleted', false)
  if (companyId) hcQuery = hcQuery.eq('company_id', companyId)
  const { data, error } = await hcQuery as { data: EmployeeRow[] | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const employees = data ?? []
  const total = employees.length
  const active = employees.filter((e) => e.employment_status === 'active').length
  const byDepartment: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  const byGender: Record<string, number> = {}

  for (const e of employees) {
    const dept = e.department ?? 'Unassigned'
    byDepartment[dept] = (byDepartment[dept] ?? 0) + 1
    byType[e.employment_type] = (byType[e.employment_type] ?? 0) + 1
    byStatus[e.employment_status] = (byStatus[e.employment_status] ?? 0) + 1
    const rawGender = e.gender ?? 'Unspecified'
    const g = rawGender.charAt(0).toUpperCase() + rawGender.slice(1).toLowerCase()
    byGender[g] = (byGender[g] ?? 0) + 1
  }

  // Monthly hires in the last 12 months
  const now = new Date()
  const monthlyHires: { month: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-KE', { month: 'short', year: '2-digit' })
    const count = employees.filter((e) => {
      const s = new Date(e.start_date)
      return s.getFullYear() === d.getFullYear() && s.getMonth() === d.getMonth()
    }).length
    monthlyHires.push({ month: label, count })
  }

  return NextResponse.json({
    data: {
      total,
      active,
      byDepartment: Object.entries(byDepartment).map(([name, value]) => ({ name, value })),
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byGender: Object.entries(byGender).map(([name, value]) => ({ name, value })),
      monthlyHires,
    },
  })
}
