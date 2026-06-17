export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

interface AttendanceEvent {
  status: string
  is_late: boolean
  [key: string]: unknown
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

  const params: Record<string, string> = { shift_date: date }
  if (companyId) params.company_id = companyId

  try {
    const res = await hrApi<DRFList<AttendanceEvent>>('/attendance-events/', { params })
    const rows = res.results

    const present = rows.filter(r => r.status === 'present').length
    const absent = rows.filter(r => r.status === 'absent').length
    const late = rows.filter(r => r.is_late === true).length

    return NextResponse.json({
      data: rows,
      stats: { present, absent, late, total: rows.length },
    })
  } catch (err) {
    console.error('Attendance summary GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json(
        { data: [], stats: { present: 0, absent: 0, late: 0, total: 0 }, error: err.message },
        { status: err.status },
      )
    }
    return NextResponse.json(
      { data: [], stats: { present: 0, absent: 0, late: 0, total: 0 }, error: 'Internal server error' },
      { status: 200 },
    )
  }
}
