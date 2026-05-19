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
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('attendance') as any)
    .select(`
      id, status, is_late, shift_date,
      check_in_time, check_out_time,
      check_in_lat, check_in_lng, distance_covered_km,
      employee:employee_profiles(
        employee_number, job_title, department,
        user:users(full_name, avatar_url)
      )
    `)
    .eq('shift_date', date)
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query as { data: AttendanceRow[] | null; error: unknown }
  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  const rows = data ?? []
  const present = rows.filter(r => r.status === 'present').length
  const absent = rows.filter(r => r.status === 'absent').length
  const late = rows.filter(r => r.is_late).length

  return NextResponse.json({ data: rows, stats: { present, absent, late, total: rows.length } })
}
