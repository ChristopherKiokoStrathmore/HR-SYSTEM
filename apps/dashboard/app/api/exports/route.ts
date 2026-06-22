export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

type ExportType = 'headcount' | 'payroll' | 'leave' | 'full'
type ExportFormat = 'xlsx' | 'json'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface DRFList<T> { count: number; results: T[] }

interface EmployeeRow {
  id: string
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
  start_date: string
  end_date: string
}

async function buildHeadcountData(companyId: string, from?: string, to?: string) {
  const params: Record<string, string | number> = { page_size: 500, company_id: companyId }
  if (from) params.start_date_after = from
  if (to) params.start_date_before = to
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
    total: rows.length,
    active: rows.filter((e) => e.employment_status === 'active').length,
    byDepartment: Object.entries(byDept).map(([name, count]) => ({ name, count })),
    byGender: Object.entries(byGender).map(([name, count]) => ({ name, count })),
    // Legacy flat format for Excel sheets
    summary: [
      { metric: 'Total Employees', value: rows.length },
      { metric: 'Active', value: rows.filter((e) => e.employment_status === 'active').length },
    ],
    byDepartmentFlat: Object.entries(byDept).map(([Department, Count]) => ({ Department, Count })),
    byGenderFlat: Object.entries(byGender).map(([Gender, Count]) => ({ Gender, Count })),
  }
}

async function buildPayrollData(companyId: string, from?: string, to?: string) {
  const params: Record<string, string | number> = { page_size: 24, company_id: companyId }
  // Filter by period_year if date range supplied
  if (from) params.period_year_gte = from.split('-')[0]
  if (to) params.period_year_lte = to.split('-')[0]
  let res: DRFList<PayrollRunRow> | null = null
  try {
    res = await hrApi<DRFList<PayrollRunRow>>('/payroll-runs/', { params })
  } catch (err) {
    console.error('[exports/payroll] fetch error:', err)
    return { rows: [], flatRows: [] }
  }

  const sorted = (res?.results ?? [])
    .slice()
    .sort((a, b) => a.period_year !== b.period_year
      ? a.period_year - b.period_year
      : a.period_month - b.period_month)

  return {
    rows: sorted.map((r) => ({
      period: `${MONTHS[r.period_month - 1]} ${r.period_year}`,
      month: r.period_month,
      year: r.period_year,
      gross: r.total_gross,
      deductions: r.total_deductions,
      net: r.total_net,
      status: r.status,
    })),
    flatRows: sorted.map((r) => ({
      Period: `${MONTHS[r.period_month - 1]} ${r.period_year}`,
      'Gross (KES)': r.total_gross,
      'Deductions (KES)': r.total_deductions,
      'Net (KES)': r.total_net,
      Status: r.status,
    })),
  }
}

async function buildLeaveData(companyId: string, from?: string, to?: string) {
  const params: Record<string, string | number> = { page_size: 10000, company_id: companyId }
  if (from) params.start_date_after = from
  if (to) params.end_date_before = to
  const res = await hrApi<DRFList<LeaveRow>>('/leave/', { params }).catch(() => null)
  const rows = res?.results ?? []

  // Aggregate by leave type for chart
  const byType: Record<string, number> = {}
  for (const l of rows) {
    byType[l.leave_type] = (byType[l.leave_type] ?? 0) + l.days_requested
  }

  return {
    rows: rows.map((l) => ({
      leaveType: l.leave_type,
      status: l.status,
      daysRequested: l.days_requested,
      startDate: l.start_date,
      endDate: l.end_date,
    })),
    byType: Object.entries(byType).map(([name, days]) => ({ name, days })),
    flatRows: rows.map((l) => ({
      'Leave Type': l.leave_type,
      Status: l.status,
      'Days Requested': l.days_requested,
    })),
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const type = (searchParams.get('type') ?? 'full') as ExportType
  const format = (searchParams.get('format') ?? 'xlsx') as ExportFormat
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const { getSessionUserId } = await import('@/lib/get-session-user')
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [hc, payroll, leave] = await Promise.all([
      (type === 'headcount' || type === 'full') ? buildHeadcountData(companyId, from, to) : null,
      (type === 'payroll' || type === 'full') ? buildPayrollData(companyId, from, to) : null,
      (type === 'leave' || type === 'full') ? buildLeaveData(companyId, from, to) : null,
    ])

    // ── JSON format (for Chart.js) ──────────────────────────────────────────
    if (format === 'json') {
      return NextResponse.json({
        type, from, to,
        headcount: hc ? {
          total: hc.total,
          active: hc.active,
          byDepartment: hc.byDepartment,
          byGender: hc.byGender,
        } : null,
        payroll: payroll ? { rows: payroll.rows } : null,
        leave: leave ? { rows: leave.rows, byType: leave.byType } : null,
      })
    }

    // ── XLSX format (existing behaviour) ────────────────────────────────────
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()

    if (hc) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.summary),        'Summary')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.byDepartmentFlat), 'Headcount by Dept')
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(hc.byGenderFlat),   'Headcount by Gender')
    }
    if (payroll) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payroll.flatRows), 'Payroll Trend')
    }
    if (leave) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leave.flatRows), 'Leave Records')
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
