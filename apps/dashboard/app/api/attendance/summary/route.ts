export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface AttendanceRow {
  id: string
  status: 'present' | 'absent' | 'half_day'
  is_late: boolean
  shift_date: string
  check_in_time: string | null
  check_out_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  distance_covered_km: number | null
  employee: {
    employee_number: string
    job_title: string
    department: string | null
    user: { full_name: string; avatar_url: string | null }
  } | null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('attendance') as any)
      .select(`
        id, status, is_late, shift_date,
        check_in_time, check_out_time,
        check_in_lat, check_in_lng, distance_covered_km,
        employee:employee_profiles!inner(
          employee_number, job_title, department,
          user:users!user_id(full_name, avatar_url)
        )
      `)
      .eq('shift_date', date)
      .order('created_at', { ascending: false })

      if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query as { data: AttendanceRow[] | null; error: unknown }
    if (error) {
      console.error('Attendance summary API error:', error)
      return NextResponse.json({ data: [], stats: { present: 0, absent: 0, late: 0, total: 0 }, error: String(error) }, { status: 200 })
    }

    const rows = data ?? []
    const present = rows.filter(r => r.status === 'present').length
    const absent = rows.filter(r => r.status === 'absent').length
    const late = rows.filter(r => r.is_late).length

    return NextResponse.json({ data: rows, stats: { present, absent, late, total: rows.length } })
  } catch (err) {
    console.error('Attendance summary GET route error:', err)
    return NextResponse.json({ data: [], stats: { present: 0, absent: 0, late: 0, total: 0 }, error: 'Internal server error' }, { status: 200 })
  }
}
