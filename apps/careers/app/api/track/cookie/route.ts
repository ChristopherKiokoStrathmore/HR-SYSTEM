export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'sl_applications'
const MAX    = 20

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE)?.value
  const tokens: string[] = raw ? JSON.parse(raw) : []
  return NextResponse.json({ tokens })
}

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  const raw = req.cookies.get(COOKIE)?.value
  const tokens: string[] = raw ? JSON.parse(raw) : []
  if (token && !tokens.includes(token)) {
    tokens.unshift(token)
    if (tokens.length > MAX) tokens.pop()
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE, JSON.stringify(tokens), {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return res
}
