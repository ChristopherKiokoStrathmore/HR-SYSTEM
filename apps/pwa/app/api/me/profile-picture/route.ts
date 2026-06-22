export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

const HR_API = process.env.NEXT_PUBLIC_HR_API_URL ?? 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const body = await req.json()
  const { image_b64 } = body as { image_b64: string }
  if (!image_b64) return NextResponse.json({ error: 'image_b64 is required' }, { status: 400 })

  // Strip data URL prefix if present
  const raw = image_b64.includes(',') ? image_b64.split(',')[1] : image_b64
  const data_url = `data:image/jpeg;base64,${raw}`

  try {
    // 1. Update avatar_url in users table for immediate display
    await sql`
      UPDATE users SET avatar_url = ${data_url}
      WHERE id = ${session.user_id}
    `

    // 2. Call Django to save to employee_profiles + trigger SmileID enrollment
    let smileid: Record<string, unknown> = {}
    try {
      const djangoRes = await fetch(`${HR_API}/api/me/profile-picture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': session.user_id,
        },
        body: JSON.stringify({ user_id: session.user_id, image_b64: raw }),
      })
      if (djangoRes.ok) {
        const json = await djangoRes.json()
        smileid = json.smileid ?? {}
      }
    } catch {
      // SmileID enrollment failure should not block the profile picture save
    }

    return NextResponse.json({ ok: true, avatar_url: data_url, smileid })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
