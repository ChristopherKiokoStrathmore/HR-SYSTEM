export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'
import { sendLeaveApproved, sendLeaveRejected } from '@/lib/email'
import { getSessionUserId } from '@/lib/get-session-user'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await hrApi(`/leave/${params.id}/`)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { action, rejection_reason } = (await req.json()) as {
      action: 'approve' | 'reject'
      rejection_reason?: string
    }

    // Keep for compat — not sent to Django but may be used by callers
    await getSessionUserId()

    let data: unknown
    if (action === 'approve') {
      data = await hrApi(`/leave/${params.id}/approve/`, { method: 'POST' })
    } else {
      data = await hrApi(`/leave/${params.id}/reject/`, {
        method: 'POST',
        body: { rejection_reason: rejection_reason ?? 'Rejected by HR' },
      })
    }

    // Fetch the updated leave record to get employee email for notification
    const leaveRecord = await hrApi<Record<string, unknown>>(`/leave/${params.id}/`)

    // Send notification email — fire-and-forget, never block the response
    const employeeEmail = (leaveRecord as { employee_email?: string })?.employee_email
    const employeeName = (leaveRecord as { employee_name?: string })?.employee_name ?? 'Employee'

    if (employeeEmail && process.env.RESEND_API_KEY) {
      if (action === 'approve') {
        sendLeaveApproved({
          to: employeeEmail,
          employeeName,
          leaveType: leaveRecord.leave_type as string,
          startDate: leaveRecord.start_date as string,
          endDate: leaveRecord.end_date as string,
          daysRequested: leaveRecord.days_requested as number,
        }).catch(() => {})
      } else {
        sendLeaveRejected({
          to: employeeEmail,
          employeeName,
          leaveType: leaveRecord.leave_type as string,
          startDate: leaveRecord.start_date as string,
          endDate: leaveRecord.end_date as string,
          rejectionReason: (leaveRecord.rejection_reason as string) ?? 'Rejected by HR',
        }).catch(() => {})
      }
    }

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
