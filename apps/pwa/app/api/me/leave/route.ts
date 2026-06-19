export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = process.env.EMAIL_FROM ?? 'Sheer Logic HR <hr@sheerlogic.co.ke>'
const APP_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'https://hr.sheerlogic.co.ke'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ data: [] })

  try {
    const emp = await sql`
      SELECT id FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

    const status = new URL(req.url).searchParams.get('status')

    const rows = status
      ? await sql`
          SELECT * FROM leaves
          WHERE employee_id = ${emp[0].id}
            AND is_deleted = false
            AND status = ${status}
          ORDER BY created_at DESC LIMIT 50
        `
      : await sql`
          SELECT * FROM leaves
          WHERE employee_id = ${emp[0].id}
            AND is_deleted = false
          ORDER BY created_at DESC LIMIT 50
        `

    return NextResponse.json({ data: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  try {
    const emp = await sql`
      SELECT id, company_id FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

    const body = await req.json()
    const empId = emp[0].id
    const companyId = emp[0].company_id

    const rows = await sql`
      INSERT INTO leaves (employee_id, company_id, leave_type, start_date, end_date, days_requested, reason, status)
      VALUES (${empId}, ${companyId}, ${body.leave_type}, ${body.start_date}, ${body.end_date}, ${body.days_requested}, ${body.reason}, 'pending')
      RETURNING *
    `
    const data = rows[0]

    // Notify HR admins — fire-and-forget
    if (resend && companyId) {
      ;(async () => {
        try {
          const hrUsers = await sql`
            SELECT email, full_name FROM users
            WHERE company_id = ${companyId}
              AND role IN ('hr_admin', 'super_admin')
              AND is_deleted = false
            LIMIT 10
          `
          const hrEmails = hrUsers.map((u: { email: string }) => u.email).filter(Boolean)
          if (!hrEmails.length) return

          await resend.emails.send({
            from: FROM,
            to: hrEmails,
            subject: `New leave request from ${session.full_name}`,
            html: newLeaveHtml({
              employeeName: session.full_name,
              employeeEmail: session.email,
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
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
