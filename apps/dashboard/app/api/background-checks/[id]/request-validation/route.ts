export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiPost, HRApiError } from '@/lib/hr-api'
import { checkRateLimit } from '@/lib/rate-limit'

interface RouteParams {
  params: { id: string }
}

/**
 * POST /api/background-checks/:id/request-validation
 * Sends a Sheer Logic-branded, signable request to a validation body (DocuSeal).
 * Body: { validation_body_name, validation_body_email }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  const { id } = params
  try {
    const body = await req.json()
    const data = await hrApiPost<unknown>(
      `/background-checks/${id}/request-validation/`,
      body
    )
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
