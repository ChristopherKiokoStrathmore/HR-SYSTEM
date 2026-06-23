export const dynamic = 'force-dynamic'
import { NextRequest } from 'next/server'
import { getDb } from '@/lib/db.server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Invalid unsubscribe link.', { status: 400 })

  try {
    const sql = getDb()
    await sql`UPDATE job_alerts SET is_active = false WHERE unsubscribe_token = ${token}`
  } catch {
    return new Response('Could not unsubscribe. Please try again.', { status: 500 })
  }

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
    .box{text-align:center;max-width:400px;padding:2rem}h1{color:#80151B}p{color:#6b7280}a{color:#C9A84C}</style>
    </head><body><div class="box">
    <h1>Unsubscribed</h1>
    <p>You have been removed from this job alert. You won't receive further notifications for this alert.</p>
    <p><a href="/jobs">Browse open positions</a></p>
    </div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}
