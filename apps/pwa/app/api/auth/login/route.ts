import { NextRequest, NextResponse } from 'next/server'

const HR_API_URL = process.env.HR_API_URL || 'https://hrmanagementapi-production-dc59.up.railway.app/api'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  let res: Response
  try {
    res = await fetch(`${HR_API_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach authentication server' }, { status: 502 })
  }

  const data = await res.json()

  if (!res.ok) {
    const message = data?.error || data?.detail || data?.non_field_errors?.[0] || 'Invalid credentials'
    return NextResponse.json({ error: message }, { status: res.status })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('hr_session', JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}
