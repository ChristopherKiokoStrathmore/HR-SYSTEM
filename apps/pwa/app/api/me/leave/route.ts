export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient, createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext } from '@/lib/employee-context'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'Sheer Logic HR <hr@sheerlogic.co.ke>'
const APP_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://hr.sheerlogic.co.ke'

export async function GET(req: NextRequest) {
  const supa = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supa.auth.getUser()

  const { employee: emp } = await resolveEmployeeContext(service, user)
  if (!emp) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = (supa.from('leaves') as any)
    .select('*')
    .eq('employee_id', emp.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supa = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supa.auth.getUser()

  const { employee: emp } = await resolveEmployeeContext(service, user)
  if (!emp) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await (service.from('leaves') as any).insert({
    ...body,
    employee_id: emp.id,
    company_id: emp.company_id,
    tenant_id: emp.tenant_id,
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify HR admins — fire-and-forget, never blocks the response
  if (resend && emp.company_id) {
    ;(async () => {
      try {
        const { data: hrUsers } = await (service.from('users') as any)
          .select('email')
          .eq('company_id', emp.company_id)
          .in('role', ['hr_admin', 'super_admin'])
          .eq('is_deleted', false)
          .limit(10)

        const hrEmails: string[] = (hrUsers ?? []).map((u: any) => u.email).filter(Boolean)
        if (!hrEmails.length) return

        const employeeName: string = (emp.user as any)?.full_name ?? 'Employee'
        const employeeEmail: string = (emp.user as any)?.email ?? user?.email ?? ''

        await resend.emails.send({
          from: FROM,
          to: hrEmails,
          subject: `New leave request from ${employeeName}`,
          html: newLeaveHtml({
            employeeName,
            employeeEmail,
            leaveType: body.leave_type,
            startDate: body.start_date,
            endDate: body.end_date,
            daysRequested: body.days_requested,
            reason: body.reason,
            reviewUrl: `${APP_URL}/dashboard/leave`,
          }),
        })
      } catch {}
    })()
  }

  return NextResponse.json({ data }, { status: 201 })
}

function newLeaveHtml(opts: {
  employeeName: string; employeeEmail: string; leaveType: string
  startDate: string; endDate: string; daysRequested: number; reason: string; reviewUrl: string
}) {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#6B7280;font-size:14px;width:40%;">${label}</td>
     <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#1A2E5A;font-size:14px;font-weight:600;">${value}</td></tr>`

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:Inter,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
<tr><td align="center"><table width="560" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#1A2E5A,#0D1B3E);padding:32px 40px;">
  <span style="color:#fff;font-size:20px;font-weight:800;">Sheer Logic HR</span>
</td></tr>
<tr><td style="padding:40px;">
  <h2 style="margin:0 0 8px;color:#1A2E5A;font-size:22px;font-weight:800;">New leave request pending review</h2>
  <p style="margin:0 0 24px;color:#6B7280;font-size:15px;">Awaiting your approval.</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    ${row('Employee', opts.employeeName)}
    ${row('Email', opts.employeeEmail)}
    ${row('Leave Type', opts.leaveType.charAt(0).toUpperCase() + opts.leaveType.slice(1))}
    ${row('Start Date', opts.startDate)}
    ${row('End Date', opts.endDate)}
    ${row('Days', `${opts.daysRequested} working day${opts.daysRequested !== 1 ? 's' : ''}`)}
  </table>
  <div style="background:#F8FAFF;border-radius:12px;padding:16px;margin-bottom:28px;">
    <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;">Reason</p>
    <p style="margin:0;font-size:14px;color:#374151;">${opts.reason}</p>
  </div>
  <a href="${opts.reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#F47920,#E8650A);color:#fff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">Review in Dashboard →</a>
</td></tr>
<tr><td style="background:#F8FAFF;padding:20px 40px;border-top:1px solid #E2E8F0;">
  <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">Automated message — Sheer Logic HR</p>
</td></tr>
</table></td></tr></table>
</body></html>`
}
