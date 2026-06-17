export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'
import { checkRateLimit } from '@/lib/rate-limit'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/background-checks/[id]
 * Get a single background check by ID
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const data = await hrApi<unknown>(`/background-checks/${id}/`)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Background check GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/background-checks/[id]
 * Update a background check (status, review, etc.)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const { id } = await params
    const body = await req.json()
    const data = await hrApi<unknown>(`/background-checks/${id}/`, { method: 'PATCH', body })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Background check PUT route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/background-checks/[id]
 * Delete a background check
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const { id } = await params
    await hrApi<unknown>(`/background-checks/${id}/`, { method: 'DELETE' })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Background check DELETE route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
