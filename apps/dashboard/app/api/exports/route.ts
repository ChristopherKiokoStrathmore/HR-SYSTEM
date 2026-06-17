export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

type ExportType = 'headcount' | 'payroll' | 'leave' | 'full'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface DRFList<T> {
  count: number
  results: T[]
}

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

async function buildHeadcountSheet(companyId: string) {
  const params: Record<string, string | number> = { page_size: 500, company_id: companyId }
  const res = await hrApi<DRFList<EmployeeRow>>('/all-employees/', { params }).catch(() => null)
  const rows = res?.results ?? []

  const byDept: Record<string, number> = {}
  const byGender: Record<string, number> = {}

  for (const e of rows) {
    const dept = e.department ?? 'Unassigned'
    byDept[dept] = (byDept[dept] ?? 0) + 1
    const g = e.gender ?? 'Unspecified'
    byGender[g] = (byGender[g] ?? 0) + 1
  }

  return {
    summary: [
      { metric: 'Total Employees', value: rows.length },
      { metric: 'Active', value: rows.filter((e) => e.employment_status === 'active').length },
    ],
    byDepartment: Object.entries(byDept).map(([Department, Count]) => ({ Department, Count })),
    byGender: Object.entries(byGender).map(([Gender, Count]) => ({ Gender, Count })),
  }
}

async function buildPayrollSheet(companyId: string) {
  const params: Record<string, string | number> = { page_size: 24, company_id: companyId }
  let res: DRFList<PayrollRunRow> | null = null
  try {
    res = await hrApi<DRFList<PayrollRunRow>>('/payroll-runs/', { params })
  } catch (err) {
    // Django returns 500 on this endpoint currently — return empty gracefully
    console.error('[exports/payroll] fetch error (expected):', err)
    return []
  }

  return (res?.results ?? [])
    .slice()
    .sort((a, b) => a.period_year !== b.period_year ? a.period_year - b.period_year : a.period_month - b.period_month)
    .map((r) => ({
      Period: `${MONTHS[r.period_month - 1]} ${r.period_year}`,
      'Gross (KES)': r.total_gross,
      'Deductions (KES)': r.total_deductions,
      'Net (KES)': r.total_net,
      Status: r.status,
    }))
}

async function buildLeaveSheet(companyId: string) {
  const params: Record<string, string | number> = { page_size: 10000, company_id: companyId }
  const res = await hrApi<DRFList<LeaveRow>>('/leave/', { params }).catch(() => null)

  return (res?.results ?? []).map((l) => ({
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

  const { getSessionUserId } = await import('@/lib/get-session-user')
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Dynamically import xlsx to keep cold-start light
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    if (type === 'headcount' || type === 'full') {
      const hc = await buildHeadcountSheet(companyId)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.summary),       'Summary')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.byDepartment),  'Headcount by Dept')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.byGender),      'Headcount by Gender')
    }

    if (type === 'payroll' || type === 'full') {
      const payroll = await buildPayrollSheet(companyId)
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payroll), 'Payroll Trend')
    }

    if (type === 'leave' || type === 'full') {
      const leave = await buildLeaveSheet(companyId)
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
