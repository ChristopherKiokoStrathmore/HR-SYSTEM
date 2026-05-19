export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface LeaveRow {
  leave_type: string
  status: string
  days_requested: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  const supabase = createServerClient(true)
  const { data, error } = await (supabase.from('leaves') as any)
    .select('leave_type, status, days_requested')
    .eq('company_id', companyId)
    .eq('is_deleted', false) as { data: LeaveRow[] | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const leaves = data ?? []
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
