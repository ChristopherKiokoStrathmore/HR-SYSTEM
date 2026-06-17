export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')
  const action = searchParams.get('action')
  const companyId = searchParams.get('companyId')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)

  const params: Record<string, string> = { page_size: String(limit) }
  if (entityId) params.entity_id = entityId
  if (action) params.action = action
  if (companyId) params.company_id = companyId

  try {
    const res = await hrApi<DRFList<unknown>>('/audit/', { params })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    console.error('Audit log GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message, data: [] }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}
