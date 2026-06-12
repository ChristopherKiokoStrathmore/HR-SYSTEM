export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/intasend/wallet-balance
 * Get IntaSend wallet balance for disbursements
 */
export async function GET() {
  try {
    const data = await hrApiGet<{
      success: boolean
      balance?: number
      currency?: string
      message?: string
    }>('/intasend/wallet_balance/')
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to get IntaSend wallet balance:', err)
    return NextResponse.json({ error: 'Failed to get wallet balance' }, { status: 500 })
  }
}
