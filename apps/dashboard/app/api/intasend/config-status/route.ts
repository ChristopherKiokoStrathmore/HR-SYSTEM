export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/intasend/config-status
 * Check if IntaSend is properly configured for M-Pesa B2C payments
 */
export async function GET() {
  try {
    const data = await hrApiGet<{
      configured: boolean
      sandbox: boolean
      provider: string
    }>('/intasend/config_status/')
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to check IntaSend config:', err)
    return NextResponse.json({ error: 'Failed to check IntaSend configuration' }, { status: 500 })
  }
}
