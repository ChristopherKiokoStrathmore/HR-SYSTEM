export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import type { EftRequest, EftResponse } from '@hr/shared'

export async function POST(req: NextRequest) {
  const body: EftRequest = await req.json()
  await new Promise((resolve) => setTimeout(resolve, 2000))

  const response: EftResponse = {
    transaction_id: `EFT-${Date.now()}`,
    status: 'PENDING',
    estimated_clearance: '2-3 business days',
  }

  return NextResponse.json(response)
}
