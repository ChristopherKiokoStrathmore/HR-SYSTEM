import { Resend } from 'resend'

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')
  return new Resend(process.env.RESEND_API_KEY)
}

const FROM = process.env.EMAIL_FROM ?? 'Sheer Logic HR <hr@sheerlogic.co.ke>'
const BRAND_ORANGE = '#F47920'
const BRAND_NAVY = '#1A2E5A'

function baseTemplate(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_NAVY} 0%,#0D1B3E 100%);padding:32px 40px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:36px;height:36px;background:${BRAND_ORANGE};border-radius:10px;display:inline-block;vertical-align:middle;"></div>
              <span style="color:#ffffff;font-size:20px;font-weight:800;vertical-align:middle;margin-left:10px;">Sheer Logic HR</span>
            </div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#F8FAFF;padding:20px 40px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              This is an automated message from Sheer Logic HR System. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function badge(text: string, color: string, bg: string) {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:100px;background:${bg};color:${color};font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">${text}</span>`
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#6B7280;font-size:14px;width:40%;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;color:#1A2E5A;font-size:14px;font-weight:600;">${value}</td>
  </tr>`
}

// ─── Templates ────────────────────────────────────────────────────────────────

export function leaveApprovedHtml(opts: {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
}) {
  const body = `
    <h2 style="margin:0 0 8px;color:${BRAND_NAVY};font-size:22px;font-weight:800;">Your leave has been approved ✓</h2>
    <p style="margin:0 0 24px;color:#6B7280;font-size:15px;">Hi ${opts.employeeName}, your leave request has been reviewed and approved.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow('Leave Type', opts.leaveType.charAt(0).toUpperCase() + opts.leaveType.slice(1))}
      ${infoRow('Start Date', opts.startDate)}
      ${infoRow('End Date', opts.endDate)}
      ${infoRow('Days', `${opts.daysRequested} working day${opts.daysRequested !== 1 ? 's' : ''}`)}
      ${infoRow('Status', '')}
    </table>
    <div style="margin-bottom:24px;">${badge('Approved', '#16A34A', 'rgba(34,197,94,0.12)')}</div>
    <p style="margin:0;color:#6B7280;font-size:14px;">Enjoy your time off. Your manager and HR have been notified.</p>
  `
  return baseTemplate('Leave Approved — Sheer Logic HR', body)
}

export function leaveRejectedHtml(opts: {
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  rejectionReason: string
}) {
  const body = `
    <h2 style="margin:0 0 8px;color:${BRAND_NAVY};font-size:22px;font-weight:800;">Leave request update</h2>
    <p style="margin:0 0 24px;color:#6B7280;font-size:15px;">Hi ${opts.employeeName}, your leave request could not be approved at this time.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow('Leave Type', opts.leaveType.charAt(0).toUpperCase() + opts.leaveType.slice(1))}
      ${infoRow('Dates', `${opts.startDate} → ${opts.endDate}`)}
      ${infoRow('Status', '')}
    </table>
    <div style="margin-bottom:20px;">${badge('Not Approved', '#DC2626', 'rgba(239,68,68,0.10)')}</div>
    <div style="background:#FFF8F6;border-left:4px solid ${BRAND_ORANGE};border-radius:0 8px 8px 0;padding:16px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#374151;"><strong>Reason:</strong> ${opts.rejectionReason}</p>
    </div>
    <p style="margin:0;color:#6B7280;font-size:14px;">Please speak with HR or your manager if you have questions.</p>
  `
  return baseTemplate('Leave Request Update — Sheer Logic HR', body)
}

export function newLeaveRequestHtml(opts: {
  employeeName: string
  employeeEmail: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
  reason: string
  reviewUrl: string
}) {
  const body = `
    <h2 style="margin:0 0 8px;color:${BRAND_NAVY};font-size:22px;font-weight:800;">New leave request</h2>
    <p style="margin:0 0 24px;color:#6B7280;font-size:15px;">A new leave request has been submitted and is awaiting your review.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      ${infoRow('Employee', opts.employeeName)}
      ${infoRow('Email', opts.employeeEmail)}
      ${infoRow('Leave Type', opts.leaveType.charAt(0).toUpperCase() + opts.leaveType.slice(1))}
      ${infoRow('Start Date', opts.startDate)}
      ${infoRow('End Date', opts.endDate)}
      ${infoRow('Days', `${opts.daysRequested} working day${opts.daysRequested !== 1 ? 's' : ''}`)}
    </table>
    <div style="background:#F8FAFF;border-radius:12px;padding:16px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;">Reason</p>
      <p style="margin:0;font-size:14px;color:#374151;">${opts.reason}</p>
    </div>
    <a href="${opts.reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,${BRAND_ORANGE},#E8650A);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-weight:700;font-size:15px;">Review Request →</a>
  `
  return baseTemplate('New Leave Request — Sheer Logic HR', body)
}

// ─── Senders ──────────────────────────────────────────────────────────────────

export async function sendLeaveApproved(opts: {
  to: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
}) {
  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Your leave request has been approved ✓',
    html: leaveApprovedHtml(opts),
  })
}

export async function sendLeaveRejected(opts: {
  to: string
  employeeName: string
  leaveType: string
  startDate: string
  endDate: string
  rejectionReason: string
}) {
  return getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Update on your leave request',
    html: leaveRejectedHtml(opts),
  })
}

export async function sendNewLeaveRequest(opts: {
  to: string | string[]
  employeeName: string
  employeeEmail: string
  leaveType: string
  startDate: string
  endDate: string
  daysRequested: number
  reason: string
  reviewUrl: string
}) {
  const recipients = Array.isArray(opts.to) ? opts.to : [opts.to]
  return getResend().emails.send({
    from: FROM,
    to: recipients,
    subject: `New leave request from ${opts.employeeName}`,
    html: newLeaveRequestHtml(opts),
  })
}
