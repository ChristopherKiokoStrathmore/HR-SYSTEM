export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import type { AirtelRequest, AirtelResponse } from '@hr/shared'

export async function POST(req: NextRequest) {
  const body: AirtelRequest = await req.json()
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const response: AirtelResponse = {
    transaction_id: `AM-${Date.now()}`,
    status: Math.random() < 0.05 ? 'FAILED' : 'SUCCESS',
    message: 'Payment initiated',
  }

  return NextResponse.json(response)
}
