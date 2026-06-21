export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * GET /api/auth/session
 * Exposes the safe (non-token) fields of the httpOnly hr_session cookie to the
 * client — used for role-based UI gating (e.g. the company switcher).
 */
export async function GET() {
  try {
    const store = await cookies()
    const raw = store.get('hr_session')?.value
    if (!raw) return NextResponse.json({ user: null })
    const data = JSON.parse(raw.includes('%') ? decodeURIComponent(raw) : raw)
    return NextResponse.json({
      user: {
        user_id: data?.user_id ?? data?.user?.id ?? null,
        email: data?.email ?? null,
        full_name: data?.full_name ?? data?.username ?? null,
        role: data?.role ?? null,
        company_id: data?.company_id ?? null,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
