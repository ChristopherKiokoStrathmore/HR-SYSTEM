export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/pesapal/ipns
 * Get list of registered IPN URLs
 */
export async function GET() {
  try {
    const data = await hrApiGet('/pesapal/list_ipns/')
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to list IPNs:', err)
    return NextResponse.json({ error: 'Failed to list IPNs' }, { status: 500 })
  }
}
