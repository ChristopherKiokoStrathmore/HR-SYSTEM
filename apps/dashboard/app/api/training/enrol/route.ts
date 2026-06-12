export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

// Enrol one or more employees into a training session
export async function POST(req: NextRequest) {
  const supabase = createServerClient(true)
  const { sessionId, employeeIds } = (await req.json()) as {
    sessionId: string
    employeeIds: string[]
  }

  if (!sessionId || !employeeIds?.length) {
    return NextResponse.json({ error: 'sessionId and employeeIds required' }, { status: 400 })
  }

  const rows = employeeIds.map((eid) => ({
    training_session_id: sessionId,
    employee_id: eid,
    attendance_status: 'enrolled',
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('training_attendees') as any)
    .upsert(rows, { onConflict: 'training_session_id,employee_id' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
