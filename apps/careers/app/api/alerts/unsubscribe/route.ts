export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new Response('Invalid unsubscribe link.', { status: 400 })

  const supabase = createServerClient(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('job_alerts') as any)
    .update({ is_active: false })
    .eq('unsubscribe_token', token)

  if (error) return new Response('Could not unsubscribe. Please try again.', { status: 500 })

  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
    .box{text-align:center;max-width:400px;padding:2rem}h1{color:#1A2E5A}p{color:#6b7280}a{color:#F47920}</style>
    </head><body><div class="box">
    <h1>Unsubscribed</h1>
    <p>You have been removed from this job alert. You won't receive further notifications for this alert.</p>
    <p><a href="/jobs">Browse open positions</a></p>
    </div></body></html>`,
    { headers: { 'Content-Type': 'text/html' } },
  )
}
