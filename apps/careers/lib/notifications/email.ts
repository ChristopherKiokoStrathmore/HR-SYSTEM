import type { JobPosting, JobAlert } from './match-alerts'

const CAREERS_URL = process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildHtml(alert: JobAlert, job: JobPosting): string {
  const jobUrl         = `${CAREERS_URL}/jobs/${job.id}`
  const unsubscribeUrl = `${CAREERS_URL}/api/alerts/unsubscribe?token=${alert.unsubscribe_token}`
  const closing        = formatDate(job.closing_date)
  const greeting       = alert.name ? `Hi ${alert.name},` : 'Hi there,'

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Job Alert – ${job.title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;color:#111827}
  .wrap{max-width:560px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .header{background:#1A2E5A;padding:1.5rem 2rem;display:flex;align-items:center;gap:.75rem}
  .header img{width:36px;height:36px;border-radius:6px}
  .header-text{color:#fff}
  .header-text p{margin:0;font-size:.75rem;opacity:.7;letter-spacing:.05em;text-transform:uppercase}
  .header-text h1{margin:0;font-size:1rem;font-weight:700}
  .body{padding:1.75rem 2rem}
  .greeting{color:#374151;margin-bottom:1rem}
  .card{border:1px solid #e5e7eb;border-radius:8px;padding:1.25rem;margin-bottom:1.25rem}
  .job-title{font-size:1.1rem;font-weight:700;color:#1A2E5A;margin:0 0 .5rem}
  .meta{font-size:.8rem;color:#6b7280;display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem}
  .badge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:.2rem .6rem;border-radius:999px;font-size:.75rem;font-weight:600}
  .badge.casual{background:#fffbeb;color:#92400e;border-color:#fde68a}
  .badge.exp{background:#f0fdf4;color:#166534;border-color:#bbf7d0}
  .snippet{font-size:.85rem;color:#4b5563;line-height:1.6;margin-bottom:1rem}
  .btn{display:inline-block;background:#F47920;color:#fff;text-decoration:none;padding:.65rem 1.5rem;border-radius:8px;font-weight:700;font-size:.9rem}
  .footer{border-top:1px solid #f3f4f6;padding:1rem 2rem;font-size:.75rem;color:#9ca3af;text-align:center}
  .footer a{color:#F47920;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png" alt="Sheer Logic" />
    <div class="header-text">
      <h1>Sheer Logic</h1>
      <p>Job Alert</p>
    </div>
  </div>
  <div class="body">
    <p class="greeting">${greeting}</p>
    <p style="color:#374151;margin-bottom:1.25rem">A new position matching your job alert is now open:</p>
    <div class="card">
      <h2 class="job-title">${job.title}</h2>
      <div class="meta">
        ${job.location_name ? `<span>📍 ${job.location_name}</span>` : ''}
        <span class="badge ${job.employment_type === 'casual' ? 'casual' : ''}">${job.employment_type === 'white_collar' ? 'Professional' : 'Casual'}</span>
        ${job.experience_level ? `<span class="badge exp">${job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)}</span>` : ''}
        ${closing ? `<span>Closes ${closing}</span>` : ''}
      </div>
      <p class="snippet">${job.description.replace(/\n/g, ' ').slice(0, 220)}…</p>
      <a href="${jobUrl}" class="btn">View &amp; Apply →</a>
    </div>
    <p style="font-size:.8rem;color:#6b7280">This alert was triggered because it matches your saved preferences. You can <a href="${unsubscribeUrl}" style="color:#F47920">unsubscribe</a> at any time.</p>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} Sheer Logic Management Consultants Ltd &nbsp;·&nbsp;
    <a href="${CAREERS_URL}/jobs">Browse all jobs</a> &nbsp;·&nbsp;
    <a href="${unsubscribeUrl}">Unsubscribe</a>
  </div>
</div>
</body>
</html>`
}

export async function sendAlertEmail(alert: JobAlert, job: JobPosting): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email')
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sheer Logic Job Centre <alerts@sheerlogicltd.com>',
        to:   alert.email,
        subject: `New job alert: ${job.title}${job.location_name ? ` · ${job.location_name}` : ''}`,
        html: buildHtml(alert, job),
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[email] Resend error:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] fetch error:', err)
    return false
  }
}
