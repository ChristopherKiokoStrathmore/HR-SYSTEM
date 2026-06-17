export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')

  if (!employeeId) {
    return NextResponse.json({ error: 'employeeId required' }, { status: 400 })
  }

  try {
    const res = await hrApi<DRFList<unknown>>('/onboarding-documents/', {
      params: { employee_id: employeeId },
    })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    console.error('Documents GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await hrApi<unknown>('/onboarding-documents/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Documents POST route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
