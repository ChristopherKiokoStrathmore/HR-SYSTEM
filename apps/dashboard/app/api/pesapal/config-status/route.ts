export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/pesapal/config-status
 * Check if PesaPal is properly configured
 */
export async function GET() {
  try {
    const data = await hrApiGet('/pesapal/config_status/')
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to check PesaPal config:', err)
    return NextResponse.json({ error: 'Failed to check PesaPal configuration' }, { status: 500 })
  }
}
