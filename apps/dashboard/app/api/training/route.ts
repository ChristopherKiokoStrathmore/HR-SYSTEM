export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface AttendeeRow {
  attendance_status: string
  score: number | null
  certificate_url: string | null
  training_session: {
    id: string
    title: string
    trainer_name: string
    start_date: string
    end_date: string
    is_mandatory: boolean
    department: string | null
  } | null
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')

  if (!employeeId) return NextResponse.json({ error: 'employeeId required' }, { status: 400 })

  // training_attendees is not in the generated Database type yet â€” cast to any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('training_attendees') as any)
    .select(`
      attendance_status,
      score,
      certificate_url,
      training_session:training_sessions(
        id, title, trainer_name, start_date, end_date,
        is_mandatory, department
      )
    `)
    .eq('employee_id', employeeId) as { data: AttendeeRow[] | null; error: unknown }

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  const flat = (data ?? []).map((row) => ({
    ...(row.training_session ?? {}),
    attendance_status: row.attendance_status,
    score: row.score,
    certificate_url: row.certificate_url,
  }))

  return NextResponse.json({ data: flat })
}
