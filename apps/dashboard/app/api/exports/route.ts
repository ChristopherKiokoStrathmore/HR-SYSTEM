export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

type ExportType = 'headcount' | 'payroll' | 'leave' | 'full'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface EmployeeRow {
  department: string | null
  employment_type: string
  employment_status: string
  start_date: string
  gender: string | null
}

interface PayrollRunRow {
  period_month: number
  period_year: number
  total_gross: number
  total_deductions: number
  total_net: number
  status: string
}

interface LeaveRow {
  leave_type: string
  status: string
  days_requested: number
}

async function buildHeadcountSheet(supabase: ReturnType<typeof createServerClient>, companyId: string) {
  const { data } = await (supabase.from('employee_profiles') as any)
    .select('department, employment_type, employment_status, start_date, gender')
    .eq('company_id', companyId)
    .eq('is_deleted', false) as { data: EmployeeRow[] | null }

  const rows = data ?? []
  const byDept: Record<string, number> = {}
  const byGender: Record<string, number> = {}

  for (const e of rows) {
    const dept = e.department ?? 'Unassigned'
    byDept[dept] = (byDept[dept] ?? 0) + 1
    const g = e.gender ?? 'Unspecified'
    byGender[g] = (byGender[g] ?? 0) + 1
  }

  return {
    summary: [{ metric: 'Total Employees', value: rows.length }, { metric: 'Active', value: rows.filter(e => e.employment_status === 'active').length }],
    byDepartment: Object.entries(byDept).map(([Department, Count]) => ({ Department, Count })),
    byGender: Object.entries(byGender).map(([Gender, Count]) => ({ Gender, Count })),
  }
}

async function buildPayrollSheet(supabase: ReturnType<typeof createServerClient>, companyId: string) {
  const { data } = await (supabase.from('payroll_runs') as any)
    .select('period_month, period_year, total_gross, total_deductions, total_net, status')
    .eq('company_id', companyId)
    .eq('is_deleted', false)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(24) as { data: PayrollRunRow[] | null }

  return (data ?? []).reverse().map(r => ({
    Period: `${MONTHS[r.period_month - 1]} ${r.period_year}`,
    'Gross (KES)': r.total_gross,
    'Deductions (KES)': r.total_deductions,
    'Net (KES)': r.total_net,
    Status: r.status,
  }))
}

async function buildLeaveSheet(supabase: ReturnType<typeof createServerClient>, companyId: string) {
  const { data } = await (supabase.from('leaves') as any)
    .select('leave_type, status, days_requested')
    .eq('company_id', companyId)
    .eq('is_deleted', false) as { data: LeaveRow[] | null }

  return (data ?? []).map(l => ({
    'Leave Type': l.leave_type,
    Status: l.status,
    'Days Requested': l.days_requested,
  }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const type = (searchParams.get('type') ?? 'full') as ExportType

  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const supabase = createServerClient(true)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Dynamically import xlsx to keep cold-start light
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    if (type === 'headcount' || type === 'full') {
      const hc = await buildHeadcountSheet(supabase, companyId)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.summary),       'Summary')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.byDepartment),  'Headcount by Dept')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.byGender),      'Headcount by Gender')
    }

    if (type === 'payroll' || type === 'full') {
      const payroll = await buildPayrollSheet(supabase, companyId)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payroll), 'Payroll Trend')
    }

    if (type === 'leave' || type === 'full') {
      const leave = await buildLeaveSheet(supabase, companyId)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leave), 'Leave Records')
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const filename = `hr-report-${type}-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buf.length.toString(),
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
