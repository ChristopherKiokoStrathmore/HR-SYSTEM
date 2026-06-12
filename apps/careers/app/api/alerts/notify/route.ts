export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { alertMatchesJob, type JobPosting, type JobAlert } from '@/lib/notifications/match-alerts'
import { sendAlertEmail } from '@/lib/notifications/email'
import { sendAlertSms }   from '@/lib/notifications/sms'

// Called by the dashboard or a Supabase Database Webhook when a job is published.
// Supabase webhook payload: { type, table, record, old_record }
// Manual call:              { job_posting_id }

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

    // Supabase webhook format
    if (body.record?.id && body.record?.status === 'open') {
      // Only fire when status transitions TO open
      if (body.type === 'INSERT' || body.old_record?.status !== 'open') {
        jobId = body.record.id
      }
    }
    // Manual trigger format
    else if (body.job_posting_id) {
      jobId = body.job_posting_id
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!jobId) return NextResponse.json({ skipped: true })

  const supabase = createServerClient(true)

  // Fetch the job posting
  const { data: job } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, employment_type, experience_level, location_name, location_lat, location_lng, closing_date, status')
    .eq('id', jobId)
    .eq('status', 'open')
    .eq('is_deleted', false)
    .single()

  if (!job) return NextResponse.json({ skipped: true, reason: 'job not found or not open' })

  // Fetch active instant-frequency alerts
  const { data: alerts } = await supabase
    .from('job_alerts')
    .select('id, name, email, phone, keywords, categories, job_types, experience_levels, location_name, location_lat, location_lng, radius_km, unsubscribe_token, frequency')
    .eq('is_active', true)
    .eq('frequency', 'instant')

  if (!alerts?.length) return NextResponse.json({ sent: 0 })

  const jobPosting = job as unknown as JobPosting
  const matched    = (alerts as unknown as JobAlert[]).filter((a) => alertMatchesJob(a, jobPosting))

  let emailsSent = 0
  let smsSent    = 0

  for (const alert of matched) {
    // Skip if already notified for this job
    const { data: existing } = await supabase
      .from('job_alert_logs')
      .select('id')
      .eq('alert_id', alert.id)
      .eq('job_posting_id', jobId)
      .limit(1)

    if (existing?.length) continue

    const [emailOk, smsOk] = await Promise.all([
      sendAlertEmail(alert, jobPosting),
      alert.phone ? sendAlertSms(alert, jobPosting) : Promise.resolve(false),
    ])

    // Log what was sent
    const logs: { alert_id: string; job_posting_id: string; channel: string; status: string }[] = []
    if (emailOk) logs.push({ alert_id: alert.id, job_posting_id: jobId, channel: 'email', status: 'sent' })
    if (smsOk)   logs.push({ alert_id: alert.id, job_posting_id: jobId, channel: 'sms',   status: 'sent' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (logs.length) await (supabase.from('job_alert_logs') as any).insert(logs)

    if (emailOk) emailsSent++
    if (smsOk)   smsSent++
  }

  return NextResponse.json({ matched: matched.length, emailsSent, smsSent })
}
