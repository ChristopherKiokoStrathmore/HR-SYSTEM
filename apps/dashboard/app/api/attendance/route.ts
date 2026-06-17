export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId required', data: [] }, { status: 200 })
  }

  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const params: Record<string, string> = {
    employee_id: employeeId,
    page_size: '60',
  }
  if (from) params.date_after = from
  if (to) params.date_before = to

  try {
    const res = await hrApi<DRFList<unknown>>('/attendance-events/', { params })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    console.error('Attendance GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message, data: [] }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await hrApi<unknown>('/attendance-events/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Attendance POST route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
