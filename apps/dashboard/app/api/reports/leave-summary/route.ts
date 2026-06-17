export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

interface DRFList<T> {
  count: number
  results: T[]
}

interface LeaveRow {
  leave_type: string
  status: string
  days_requested: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  const params: Record<string, string | number> = { page_size: 1000 }
  if (companyId) params.company_id = companyId

  const res = await hrApi<DRFList<LeaveRow>>('/leave/', { params }).catch((err) => {
    console.error('[leave-summary] fetch error:', err)
    return null
  })

  if (!res) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const leaves = res.results ?? []
  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  let totalDays = 0

  for (const l of leaves) {
    byType[l.leave_type] = (byType[l.leave_type] ?? 0) + l.days_requested
    byStatus[l.status] = (byStatus[l.status] ?? 0) + 1
    if (l.status === 'approved') totalDays += l.days_requested
  }

  return NextResponse.json({
    data: {
      totalRequests: leaves.length,
      approvedDays: totalDays,
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
    },
  })
}
