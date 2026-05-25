export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, hrApiPut, hrApiDelete, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/payroll/runs/[id]
 * Get payroll run details with all records
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await hrApiGet(`/payroll-runs/${id}/`)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to fetch payroll run:', err)
    return NextResponse.json({ error: 'Failed to fetch payroll run' }, { status: 500 })
  }
}

/**
 * PUT /api/payroll/runs/[id]
 * Update payroll run
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = await hrApiPut(`/payroll-runs/${id}/`, body)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to update payroll run:', err)
    return NextResponse.json({ error: 'Failed to update payroll run' }, { status: 500 })
  }
}

/**
 * DELETE /api/payroll/runs/[id]
 * Delete payroll run
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await hrApiDelete(`/payroll-runs/${id}/`)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to delete payroll run:', err)
    return NextResponse.json({ error: 'Failed to delete payroll run' }, { status: 500 })
  }
}
