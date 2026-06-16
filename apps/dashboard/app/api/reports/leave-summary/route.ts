export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

interface LeaveRow {
  leave_type: string
  status: string
  days_requested: number | string
}

const TYPE_LABELS: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', maternity: 'Maternity', paternity: 'Paternity',
  study: 'Study', compassionate: 'Compassionate', unpaid: 'Unpaid',
  adoption: 'Adoption', family: 'Family',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined

  const { data, error } = await djangoGet<LeaveRow[]>('/leave/', {
    company_id: companyId,
    page_size: 5000,
  })
  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const requests = data ?? []
  const totalRequests = requests.length
  const approvedDays = requests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + Number(r.days_requested), 0)

  const byTypeMap = new Map<string, number>()
  const byStatusMap = new Map<string, number>()
  for (const r of requests) {
    const typeLabel = TYPE_LABELS[r.leave_type] ?? r.leave_type
    byTypeMap.set(typeLabel, (byTypeMap.get(typeLabel) ?? 0) + Number(r.days_requested))
    const statusLabel = STATUS_LABELS[r.status] ?? r.status
    byStatusMap.set(statusLabel, (byStatusMap.get(statusLabel) ?? 0) + 1)
  }

  return NextResponse.json({
    data: {
      totalRequests,
      approvedDays,
      byType: [...byTypeMap.entries()].map(([name, value]) => ({ name, value })),
      byStatus: [...byStatusMap.entries()].map(([name, value]) => ({ name, value })),
    },
  })
}
