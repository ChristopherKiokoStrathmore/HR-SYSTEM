export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'
import { alertMatchesJob, type JobPosting, type JobAlert } from '@/lib/notifications/match-alerts'
import { sendAlertEmail } from '@/lib/notifications/email'
import { sendAlertSms }   from '@/lib/notifications/sms'

// Called by the dashboard when a job is published, or manually.
// Body: { job_posting_id }

export async function POST(req: NextRequest) {
  // Verify shared secret (set ALERT_NOTIFY_SECRET in both apps)
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
    if (body.job_posting_id) jobId = body.job_posting_id
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!jobId) return NextResponse.json({ skipped: true })

  // Fetch the job posting (public endpoint already filters status=open, is_deleted=false)
  const { data: job } = await djangoGet<JobPosting>(`/careers/jobs/${jobId}/`)
  if (!job) return NextResponse.json({ skipped: true, reason: 'job not found or not open' })

  // Fetch active instant-frequency alerts
  const { data: alerts } = await djangoGet<JobAlert[]>('/careers/alerts/matching/', { job_posting_id: jobId })
  if (!alerts?.length) return NextResponse.json({ sent: 0 })

  const matched = alerts.filter((a) => alertMatchesJob(a, job))

  // Already-notified alert/channel combos for this job, fetched once.
  const { data: existingLogs } = await djangoGet<{ alert_id: string; channel: string }[]>(
    '/careers/alerts/logs/', { job_posting_id: jobId },
  )
  const alreadySent = new Set((existingLogs ?? []).map((l) => `${l.alert_id}:${l.channel}`))

  let emailsSent = 0
  let smsSent    = 0
  const newLogs: { alert_id: string; job_posting_id: string; channel: string; status: string }[] = []

  for (const alert of matched) {
    const needsEmail = !alreadySent.has(`${alert.id}:email`)
    const needsSms   = alert.phone && !alreadySent.has(`${alert.id}:sms`)
    if (!needsEmail && !needsSms) continue

    const [emailOk, smsOk] = await Promise.all([
      needsEmail ? sendAlertEmail(alert, job) : Promise.resolve(false),
      needsSms   ? sendAlertSms(alert, job)   : Promise.resolve(false),
    ])

    if (emailOk) { newLogs.push({ alert_id: alert.id, job_posting_id: jobId, channel: 'email', status: 'sent' }); emailsSent++ }
    if (smsOk)   { newLogs.push({ alert_id: alert.id, job_posting_id: jobId, channel: 'sms',   status: 'sent' }); smsSent++ }
  }

  if (newLogs.length) await djangoPost('/careers/alerts/logs/', newLogs)

  return NextResponse.json({ matched: matched.length, emailsSent, smsSent })
}
