export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

const HR_API         = (process.env.HR_API_URL ?? process.env.NEXT_PUBLIC_HR_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY ?? ''

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const body = await req.json()
  const { image_b64, face_descriptor } = body as { image_b64: string; face_descriptor?: number[] | null }
  if (!image_b64) return NextResponse.json({ error: 'image_b64 is required' }, { status: 400 })

  const raw = image_b64.includes(',') ? image_b64.split(',')[1] : image_b64
  const data_url = `data:image/jpeg;base64,${raw}`

  try {
    // Save avatar to users table for immediate display
    await sql`
      UPDATE users SET avatar_url = ${data_url}
      WHERE id = ${session.user_id}
    `

    // Save face_descriptor to employee_profiles if provided
    if (face_descriptor && Array.isArray(face_descriptor) && face_descriptor.length === 128) {
      await sql`
        UPDATE employee_profiles
        SET face_descriptor = ${JSON.stringify(face_descriptor)}::jsonb
        WHERE user_id = ${session.user_id} AND is_deleted = false
      `
    }

    // Forward to Django to save profile_picture_url + optionally enroll face
    let djangoResult: Record<string, unknown> = {}
    try {
      const djangoRes = await fetch(`${HR_API}/api/me/profile-picture/`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-Service-Key': HR_SERVICE_KEY,
          'X-User-Id':     session.user_id,
        },
        body: JSON.stringify({
          user_id: session.user_id,
          image_b64: raw,
          face_descriptor: face_descriptor ?? null,
        }),
      })
      if (djangoRes.ok) {
        djangoResult = await djangoRes.json()
      }
    } catch {
      // Django call is best-effort — don't block the upload
    }

    return NextResponse.json({
      ok: true,
      avatar_url: data_url,
      face_enrolled: !!(face_descriptor && face_descriptor.length === 128),
      django: djangoResult,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
