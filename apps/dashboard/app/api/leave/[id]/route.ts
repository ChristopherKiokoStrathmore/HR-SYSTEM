export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { sendLeaveApproved, sendLeaveRejected } from '@/lib/email'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const { data, error } = await supabase
    .from('leaves')
    .select('*, employee:employee_profiles(employee_number, job_title, user:users!user_id(full_name, email))')
    .eq('id', params.id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const { action, rejection_reason } = (await req.json()) as {
    action: 'approve' | 'reject'
    rejection_reason?: string
  }

  const { data: { session } } = await supabase.auth.getSession()

  const update =
    action === 'approve'
      ? { status: 'approved', approved_by: session?.user.id, approved_at: new Date().toISOString() }
      : { status: 'rejected', rejection_reason: rejection_reason ?? 'Rejected by HR', approved_by: session?.user.id }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('leaves') as any)
    .update(update)
    .eq('id', params.id)
    .select(`
      *,
      employee:employee_profiles(
        job_title,
        user:users!user_id(full_name, email)
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send notification email — fire-and-forget, never block the response
  const employeeEmail = data?.employee?.user?.email
  const employeeName = data?.employee?.user?.full_name ?? 'Employee'
  if (employeeEmail && process.env.RESEND_API_KEY) {
    if (action === 'approve') {
      sendLeaveApproved({
        to: employeeEmail,
        employeeName,
        leaveType: data.leave_type,
        startDate: data.start_date,
        endDate: data.end_date,
        daysRequested: data.days_requested,
      }).catch(() => {})
    } else {
      sendLeaveRejected({
        to: employeeEmail,
        employeeName,
        leaveType: data.leave_type,
        startDate: data.start_date,
        endDate: data.end_date,
        rejectionReason: data.rejection_reason ?? 'Rejected by HR',
      }).catch(() => {})
    }
  }

  return NextResponse.json({ data })
}
