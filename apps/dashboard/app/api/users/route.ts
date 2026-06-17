export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const params: Record<string, string> = {}
    const companyId = searchParams.get('companyId')
    if (companyId) params.company_id = companyId

    const res = await hrApi<DRFList<unknown>>('/users/', { params })
    // Return flat array (not paginated) for compat with existing frontend usage
    return NextResponse.json({ data: res.results })
  } catch (err) {
    console.error('Users GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message, data: [] }, { status: 200 })
    }
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}
