export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface AttendeeRow {
  attended: boolean
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('training_attendees') as any)
    .select(`
      attended,
      training_session:training_sessions(
        id, title, trainer_name, start_date, end_date,
        is_mandatory, department
      )
    `)
    .eq('employee_id', employeeId) as { data: AttendeeRow[] | null; error: unknown }

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 })

  const flat = (data ?? []).map((row) => ({
    ...(row.training_session ?? {}),
    attendance_status: row.attended ? 'attended' : 'enrolled',
    score: null,
    certificate_url: null,
  }))

  return NextResponse.json({ data: flat })
}
