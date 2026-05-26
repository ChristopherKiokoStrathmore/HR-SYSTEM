export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { hrApiPost, HRApiError } from '@/lib/hr-api'

/**
 * POST /api/pesapal/register-ipn
 * Register IPN webhook URL with PesaPal
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const body = await req.json()
    const { callback_url } = body as { callback_url: string }

    if (!callback_url) {
      return NextResponse.json({ error: 'callback_url required' }, { status: 400 })
    }

    const data = await hrApiPost('/pesapal/register_ipn/', { callback_url })
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to register IPN:', err)
    return NextResponse.json({ error: 'Failed to register IPN' }, { status: 500 })
  }
}
