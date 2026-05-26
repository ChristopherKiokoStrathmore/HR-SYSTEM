export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApiGet, HRApiError } from '@/lib/hr-api'

/**
 * GET /api/payroll/records
 * Get payroll records for a specific employee
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 })
    }

    const data = await hrApiGet('/payroll-records/', {
      employee_id: employeeId,
    })

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('Failed to fetch payroll records:', err)
    return NextResponse.json({ error: 'Failed to fetch payroll records' }, { status: 500 })
  }
}
