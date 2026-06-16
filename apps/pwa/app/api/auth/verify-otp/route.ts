import { NextRequest, NextResponse } from 'next/server'

const DJANGO_API = process.env.HR_API_URL ?? 'http://localhost:8000/api'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'email and code are required' }, { status: 400 })
    }

    const djangoRes = await fetch(`${DJANGO_API}/auth/verify-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })

    const data = await djangoRes.json()
    if (!djangoRes.ok) {
      return NextResponse.json({ error: data.error ?? 'Invalid or expired code' }, { status: djangoRes.status })
    }

    const session = JSON.stringify({
      token: data.token,
      userId: data.user_id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      companyId: data.company_id ?? '',
      employeeId: data.employee_id ?? '',
    })

    const res = NextResponse.json({ ok: true })
    res.cookies.set('hr_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return res
  } catch (err) {
    console.error('verify-otp error:', err)
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
