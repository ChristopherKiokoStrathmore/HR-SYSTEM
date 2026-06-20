export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db.server'
import { alertMatchesJob, type JobPosting, type JobAlert } from '@/lib/notifications/match-alerts'
import { sendAlertEmail } from '@/lib/notifications/email'
import { sendAlertSms }   from '@/lib/notifications/sms'

export async function POST(req: NextRequest) {
  const secret = process.env.ALERT_NOTIFY_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization') ?? ''
    if (!authHeader.endsWith(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let jobId: string | null = null

  try {
    const body = await req.json()

    if (body.record?.id && body.record?.status === 'open') {
      if (body.type === 'INSERT' || body.old_record?.status !== 'open') {
        jobId = body.record.id
      }
    } else if (body.job_posting_id) {
      jobId = body.job_posting_id
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!jobId) return NextResponse.json({ skipped: true })

  const sql = getDb()

  const jobRows = await sql`
    SELECT id, title, department, description, required_keywords, employment_type,
           experience_level, location_name, location_lat, location_lng, closing_date, status
    FROM job_postings
    WHERE id = ${jobId} AND status = 'open' AND is_deleted = false
  `
  if (!jobRows.length) return NextResponse.json({ skipped: true, reason: 'job not found or not open' })

  const alertRows = await sql`
    SELECT id, name, email, phone, keywords, categories, job_types, experience_levels,
           location_name, location_lat, location_lng, radius_km, unsubscribe_token, frequency
    FROM job_alerts
    WHERE is_active = true AND frequency = 'instant'
  `
  if (!alertRows.length) return NextResponse.json({ sent: 0 })

  const jobPosting = jobRows[0] as unknown as JobPosting
  const matched    = (alertRows as unknown as JobAlert[]).filter((a) => alertMatchesJob(a, jobPosting))

  let emailsSent = 0
  let smsSent    = 0

  for (const alert of matched) {
    const existing = await sql`
      SELECT id FROM job_alert_logs
      WHERE alert_id = ${alert.id} AND job_posting_id = ${jobId}
      LIMIT 1
    `
    if (existing.length) continue

    const [emailOk, smsOk] = await Promise.all([
      sendAlertEmail(alert, jobPosting),
      alert.phone ? sendAlertSms(alert, jobPosting) : Promise.resolve(false),
    ])

    const logs: { alert_id: string; job_posting_id: string; channel: string; status: string }[] = []
    if (emailOk) logs.push({ alert_id: alert.id, job_posting_id: jobId, channel: 'email', status: 'sent' })
    if (smsOk)   logs.push({ alert_id: alert.id, job_posting_id: jobId, channel: 'sms',   status: 'sent' })

    for (const log of logs) {
      await sql`
        INSERT INTO job_alert_logs (alert_id, job_posting_id, channel, status)
        VALUES (${log.alert_id}, ${log.job_posting_id}, ${log.channel}, ${log.status})
      `
    }

    if (emailOk) emailsSent++
    if (smsOk)   smsSent++
  }

  return NextResponse.json({ matched: matched.length, emailsSent, smsSent })
}
