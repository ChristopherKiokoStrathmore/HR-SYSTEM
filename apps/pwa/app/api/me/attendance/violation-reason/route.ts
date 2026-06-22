export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'

const HR_API_URL     = (process.env.HR_API_URL     ?? '').replace(/\/$/, '')
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY  ?? ''

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { violation_id, reason } = await req.json()
  if (!violation_id || !reason?.trim()) {
    return NextResponse.json({ error: 'violation_id and reason are required' }, { status: 400 })
  }

  const djangoRes = await fetch(
    `${HR_API_URL}/attendance/geofence-violations/${violation_id}/submit_reason/`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Service-Key': HR_SERVICE_KEY,
        'X-User-Id':     session.user_id,
      },
      body: JSON.stringify({ reason: reason.trim() }),
      signal: AbortSignal.timeout(15_000),
    },
  )

  if (!djangoRes.ok) {
    const err = await djangoRes.json().catch(() => ({}))
    return NextResponse.json(
      { error: (err as { error?: string }).error ?? 'Failed to submit reason' },
      { status: djangoRes.status },
    )
  }

  return NextResponse.json({ ok: true })
}
