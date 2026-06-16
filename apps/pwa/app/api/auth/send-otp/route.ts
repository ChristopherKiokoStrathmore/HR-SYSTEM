import { NextRequest, NextResponse } from 'next/server'

const DJANGO_API = process.env.HR_API_URL ?? 'http://localhost:8000/api'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

    const djangoRes = await fetch(`${DJANGO_API}/auth/send-otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await djangoRes.json()
    if (!djangoRes.ok) {
      return NextResponse.json({ error: data.error ?? 'Failed to send code' }, { status: djangoRes.status })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('send-otp error:', err)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}
