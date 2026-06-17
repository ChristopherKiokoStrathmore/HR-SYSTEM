export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

  if (!companyId) {
    return NextResponse.json({ data: [] })
  }

  const params: Record<string, string> = { company_id: companyId, date }

  try {
    const res = await hrApi<DRFList<unknown>>('/geofence-violations/', { params })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    console.error('Attendance locations GET error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ data: [], error: err.message })
    }
    return NextResponse.json({ data: [], error: 'Internal server error' })
  }
}
