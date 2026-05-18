import type { JobPosting, JobAlert } from './match-alerts'

const CAREERS_URL = process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'

function buildSmsText(job: JobPosting): string {
  const loc  = job.location_name ? ` in ${job.location_name}` : ''
  const link = `${CAREERS_URL}/jobs/${job.id}`
  return `Sheer Logic Job Alert: "${job.title}"${loc} is now open. Apply: ${link}`
}

function normalisePhone(raw: string): string {
  // Convert common Kenyan formats to E.164
  const digits = raw.replace(/[\s\-().+]/g, '')
  if (digits.startsWith('07') || digits.startsWith('01')) return `+254${digits.slice(1)}`
  if (digits.startsWith('254')) return `+${digits}`
  if (digits.startsWith('256')) return `+${digits}` // Uganda
  if (digits.startsWith('250')) return `+${digits}` // Rwanda
  return digits.startsWith('+') ? raw.replace(/\s/g, '') : `+${digits}`
}

export async function sendAlertSms(alert: JobAlert, job: JobPosting): Promise<boolean> {
  if (!alert.phone) return false

  const apiKey   = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME

  if (!apiKey || !username) {
    console.warn('[sms] AT_API_KEY / AT_USERNAME not set — skipping SMS')
    return false
  }

  const phone = normalisePhone(alert.phone)
  const message = buildSmsText(job)

  try {
    const body = new URLSearchParams({
      username,
      to:      phone,
      message,
      from:    process.env.AT_SENDER_ID ?? 'SheerLogic',
    })

    const baseUrl = username === 'sandbox'
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging'

    const res = await fetch(baseUrl, {
      method:  'POST',
      headers: {
        apiKey,
        Accept:         'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await res.json()
    const recipients = data?.SMSMessageData?.Recipients ?? []
    const ok = recipients.some((r: { status: string }) => r.status === 'Success')
    if (!ok) console.error('[sms] Africa\'s Talking response:', JSON.stringify(data))
    return ok
  } catch (err) {
    console.error('[sms] fetch error:', err)
    return false
  }
}
