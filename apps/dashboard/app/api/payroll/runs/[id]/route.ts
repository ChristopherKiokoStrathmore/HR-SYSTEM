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
    const data = await hrApiGet<Record<string, unknown>>(`/payroll-runs/${id}/`)

    // Add derived fields for UI compatibility
    const periodStart = data.period_start as string
    const date = periodStart ? new Date(periodStart) : new Date()
    ;(data as Record<string, unknown>).period_month = date.getMonth() + 1
    ;(data as Record<string, unknown>).period_year = date.getFullYear()

    // Calculate total_deductions from individual components
    ;(data as Record<string, unknown>).total_deductions =
      (Number(data.total_paye) || 0) +
      (Number(data.total_nssf) || 0) +
      (Number(data.total_nhif) || 0) +
      (Number(data.total_housing_levy) || 0) +
      (Number(data.total_helb) || 0)

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
