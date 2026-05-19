export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import type { MpesaRequest, MpesaResponse } from '@hr/shared'

export async function POST(req: NextRequest) {
  const body: MpesaRequest = await req.json()

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 10% failure rate for realism
  if (Math.random() < 0.1) {
    return NextResponse.json(
      { ResponseCode: '1', ResponseDescription: 'Request cancelled by user' },
      { status: 200 }
    )
  }

  const response: MpesaResponse = {
    CheckoutRequestID: `ws_CO_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    ResponseCode: '0',
    CustomerMessage: 'Success. Request accepted for processing.',
  }

  return NextResponse.json(response)
}
