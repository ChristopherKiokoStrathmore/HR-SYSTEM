export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/active-company  { companyId: string | null }
 *
 * Cross-company roles (super_admin / company_admin) can switch the company they
 * operate on. The backend scopes payroll/HR data by the X-Company-Id header,
 * which lib/hr-api.ts derives from the hr_session cookie — so switching must
 * update that cookie, otherwise the UI shows company B while the API still
 * reads/writes company A (the login company).
 *
 * tenant_id is dropped so the backend re-derives it from the new company
 * (avoids carrying a stale cross-company tenant).
 */
const CROSS_COMPANY_ROLES = ['super_admin', 'company_admin']

export async function POST(req: NextRequest) {
  const { companyId } = (await req.json().catch(() => ({}))) as {
    companyId?: string | null
  }

  const store = await cookies()
  const raw = store.get('hr_session')?.value
  if (!raw) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  let data: Record<string, unknown>
  try {
    data = JSON.parse(raw.includes('%') ? decodeURIComponent(raw) : raw)
  } catch {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  const role = String(data?.role ?? '')
  if (!CROSS_COMPANY_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Your role cannot switch companies' },
      { status: 403 }
    )
  }

  data.company_id = companyId || ''
  delete data.tenant_id

  const response = NextResponse.json({ ok: true, company_id: data.company_id })
  response.cookies.set('hr_session', JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
