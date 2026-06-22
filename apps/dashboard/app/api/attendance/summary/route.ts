export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

interface AttendanceEvent {
  id: number
  employee_id: string
  employee_name: string | null
  time: string
  event_type: string
  out_of_zone_reason: string
  [key: string]: unknown
}

interface EmployeeRow {
  id: string
  user_id: string
  employment_status: string
}

// Africa/Nairobi is UTC+3 with no DST
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

function eatDateString(d: Date): string {
  return new Date(d.getTime() + EAT_OFFSET_MS).toISOString().split('T')[0]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const format = searchParams.get('format') // 'pdf' → return full row data too

  const now = new Date()
  const date = searchParams.get('date') ?? eatDateString(now)

  // Shift start in EAT — default 09:00
  const shiftHour = parseInt(searchParams.get('shift_hour') ?? '9', 10)
  const shiftStart = new Date(`${date}T${String(shiftHour).padStart(2, '0')}:00:00+03:00`)

  const eventParams: Record<string, string> = {
    event_type: 'check_in',
    from: `${date}T00:00:00`,
    to: `${date}T23:59:59`,
    page_size: '1000',
  }
  if (companyId) eventParams.company_id = companyId

  const employeeParams: Record<string, string> = {
    employment_status: 'active',
    page_size: '1000',
  }
  if (companyId) employeeParams.company_id = companyId

  try {
    const [eventsRes, employeesRes] = await Promise.all([
      hrApi<DRFList<AttendanceEvent>>('/attendance-events/', { params: eventParams }),
      hrApi<DRFList<EmployeeRow>>('/all-employees/', { params: employeeParams }),
    ])

    // Keep only the first (earliest) check_in per employee
    const firstCheckin = new Map<string, AttendanceEvent>()
    for (const ev of eventsRes.results) {
      const existing = firstCheckin.get(ev.employee_id)
      if (!existing || new Date(ev.time) < new Date(existing.time)) {
        firstCheckin.set(ev.employee_id, ev)
      }
    }

    let present = 0
    let late = 0
    const enrichedRows: Array<AttendanceEvent & { is_late: boolean }> = []

    for (const [, ev] of firstCheckin) {
      const isLate = new Date(ev.time) > shiftStart
      if (isLate) {
        late++
      } else {
        present++
      }
      enrichedRows.push({ ...ev, is_late: isLate })
    }

    const total = employeesRes.count || employeesRes.results.length
    const absent = Math.max(0, total - present - late)
    const daily_rate =
      total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0

    const stats = { total, present, late, absent, daily_rate, date }

    if (format === 'pdf') {
      // Return the full row list so the frontend can build a printable report
      return NextResponse.json({ stats, rows: enrichedRows })
    }

    return NextResponse.json({ data: enrichedRows, stats })
  } catch (err) {
    console.error('Attendance summary GET route error:', err)
    const empty = { total: 0, present: 0, late: 0, absent: 0, daily_rate: 0, date }
    if (err instanceof HRApiError) {
      return NextResponse.json(
        { data: [], stats: empty, error: err.message },
        { status: err.status },
      )
    }
    return NextResponse.json({ data: [], stats: empty, error: 'Internal server error' }, { status: 200 })
  }
}
