const CAREERS_URL = process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'

interface ApplicationEmailArgs {
  candidateName: string
  candidateEmail: string
  jobTitle: string
  jobId: string
  trackingToken: string
}

function buildHtml({ candidateName, jobTitle, jobId, trackingToken }: ApplicationEmailArgs) {
  const trackUrl = `${CAREERS_URL}/track/${trackingToken}`
  const jobUrl   = `${CAREERS_URL}/jobs/${jobId}`
  const greeting = candidateName ? `Hi ${candidateName.split(' ')[0]},` : 'Hi there,'

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Application Received — ${jobTitle}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;color:#111827}
  .wrap{max-width:560px;margin:2rem auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .header{background:#1A2E5A;padding:1.5rem 2rem;display:flex;align-items:center;gap:.75rem}
  .header img{width:36px;height:36px;border-radius:6px}
  .ht{color:#fff}.ht p{margin:0;font-size:.7rem;opacity:.7;letter-spacing:.08em;text-transform:uppercase}
  .ht h1{margin:0;font-size:1rem;font-weight:700}
  .body{padding:1.75rem 2rem}
  .tag{display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:999px;font-size:.75rem;font-weight:700;padding:.25rem .75rem;margin-bottom:1rem}
  h2{margin:.5rem 0 1rem;font-size:1.2rem;color:#1A2E5A}
  p{color:#374151;line-height:1.7;margin:.5rem 0}
  .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:1.25rem;margin:1.25rem 0}
  .job-title{font-weight:700;font-size:1rem;color:#1A2E5A}
  .stages{display:flex;gap:0;margin:1.25rem 0;border-radius:8px;overflow:hidden}
  .stage{flex:1;padding:.45rem .25rem;text-align:center;font-size:.65rem;font-weight:600}
  .stage.done{background:#1A2E5A;color:#fff}
  .stage.active{background:#F47920;color:#fff}
  .stage.todo{background:#f3f4f6;color:#9ca3af}
  .btn{display:inline-block;background:#F47920;color:#fff;text-decoration:none;padding:.65rem 1.5rem;border-radius:8px;font-weight:700;font-size:.9rem;margin-top:.5rem}
  .link-btn{display:inline-block;color:#F47920;text-decoration:none;font-size:.85rem;font-weight:600;margin-top:.25rem}
  .footer{border-top:1px solid #f3f4f6;padding:1rem 2rem;font-size:.75rem;color:#9ca3af;text-align:center}
  .footer a{color:#F47920;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <img src="https://sheerlogicltd.com/wp-content/uploads/2024/08/fav.png" alt="Sheer Logic" />
    <div class="ht"><h1>Sheer Logic</h1><p>Job Centre</p></div>
  </div>
  <div class="body">
    <span class="tag">✓ Application Received</span>
    <h2>${greeting}</h2>
    <p>Your application has been successfully submitted. Here's a summary:</p>
    <div class="card">
      <p class="job-title">${jobTitle}</p>
      <p style="font-size:.8rem;color:#6b7280;margin:.25rem 0 1rem">Sheer Logic Management Consultants</p>
      <div class="stages">
        <div class="stage done">Applied</div>
        <div class="stage active">Under Review</div>
        <div class="stage todo">Interview I</div>
        <div class="stage todo">Interview II</div>
        <div class="stage todo">Offer</div>
        <div class="stage todo">Hired</div>
      </div>
      <p style="font-size:.8rem;color:#374151;margin-top:.75rem">Our team will review your application shortly. If shortlisted, we'll contact you within 5–7 business days.</p>
    </div>
    <p>You can track your application status at any time using the link below — bookmark it!</p>
    <a href="${trackUrl}" class="btn">Track my application →</a>
    <br>
    <a href="${jobUrl}" class="link-btn">View job posting</a>
    <p style="font-size:.8rem;color:#9ca3af;margin-top:1.5rem">If you did not apply for this position, please disregard this email.</p>
  </div>
  <div class="footer">
    © ${new Date().getFullYear()} Sheer Logic Management Consultants Ltd &nbsp;·&nbsp;
    <a href="${CAREERS_URL}/jobs">Browse all jobs</a>
  </div>
</div>
</body>
</html>`
}

export async function sendApplicationConfirmation(args: ApplicationEmailArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return // graceful — don't block application save

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Sheer Logic Job Centre <alerts@sheerlogicltd.com>',
        to:      args.candidateEmail,
        subject: `Application received — ${args.jobTitle}`,
        html:    buildHtml(args),
      }),
    })
  } catch (err) {
    console.error('[application-email] failed (non-fatal):', err)
  }
}
