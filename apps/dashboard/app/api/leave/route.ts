export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const params: Record<string, string> = {}
    const employeeId = searchParams.get('employeeId')
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const leaveType = searchParams.get('leaveType')
    if (employeeId) params.employee_id = employeeId
    if (companyId) params.company_id = companyId
    if (status) params.status = status
    if (leaveType) params.leave_type = leaveType

    const res = await hrApi<DRFList<unknown>>('/leave/', { params })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    console.error('Leave GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message, data: [] }, { status: 200 })
    }
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await hrApi('/leave/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Leave POST route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
