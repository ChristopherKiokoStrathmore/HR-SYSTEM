export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.HR_API_URL ?? '(not set)'
  const hasServiceKey = !!process.env.HR_SERVICE_KEY
  const hasToken = !!process.env.HR_API_TOKEN

  let djangoStatus: number | null = null
  let djangoError: string | null = null
  try {
    const res = await fetch(`${process.env.HR_API_URL || 'http://localhost:8000/api'}/companies/`, {
      headers: {
        'X-Service-Key': process.env.HR_SERVICE_KEY ?? '',
        Authorization: `Token ${process.env.HR_API_TOKEN ?? ''}`,
      },
      signal: AbortSignal.timeout(9_000),
    })
    djangoStatus = res.status
  } catch (err) {
    djangoError = String(err)
  }

  return NextResponse.json({
    apiUrl,
    hasServiceKey,
    hasToken,
    djangoStatus,
    djangoError,
    ts: new Date().toISOString(),
  })
}
