export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> {
  count: number
  results: T[]
}

interface ContractRow {
  id: string
  user: { full_name: string | null } | null
  job_title: string
  end_date: string
}

interface PendingLeaveRow {
  id: string
  leave_type: string
  days_requested: number
  start_date: string
  end_date: string
  employee: null
}

const FALLBACK = {
  data: { activeEmployees: 0, onLeaveToday: 0, contractExpiries: [] as ContractRow[], pendingLeave: [] as PendingLeaveRow[] },
}

export async function GET(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const in30  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [empRes, leaveRes, contractRes, pendingLeaveRes] = await Promise.all([
      // Active employee count — page_size=1, only need the count
      hrApi<DRFList<unknown>>('/all-employees/', {
        params: { employment_status: 'active', page_size: 1 },
      }).catch((err) => { console.error('[summary] employees:', err); return null }),

      // Who is on leave today
      hrApi<DRFList<{ id: string }>>('/leave/', {
        params: { status: 'approved', start_date_before: today, end_date_after: today, page_size: 200 },
      }).catch((err) => { console.error('[summary] on-leave:', err); return null }),

      // Contracts expiring in the next 30 days
      hrApi<DRFList<{ id: string; job_title: string; end_date: string }>>('/all-employees/', {
        params: {
          employment_status: 'active',
          end_date_after: today,
          end_date_before: in30,
          page_size: 5,
        },
      }).catch((err) => { console.error('[summary] contracts:', err); return null }),

      // Pending leave approvals
      hrApi<DRFList<{ id: string; leave_type: string; days_requested: number; start_date: string; end_date: string }>>('/leave/', {
        params: { status: 'pending', page_size: 10 },
      }).catch((err) => { console.error('[summary] pending-leave:', err); return null }),
    ])

    if (process.env.NODE_ENV === 'development') {
      console.log('[summary] activeEmployees:', empRes?.count)
      console.log('[summary] onLeaveToday:', leaveRes?.results?.length)
      console.log('[summary] contractExpiries:', contractRes?.results?.length)
      console.log('[summary] pendingLeave:', pendingLeaveRes?.results?.length)
    }

    const contractExpiries: ContractRow[] = (contractRes?.results ?? []).map((p) => ({
      id: p.id,
      job_title: p.job_title,
      end_date: p.end_date,
      user: { full_name: null },
    }))

    const pendingLeave: PendingLeaveRow[] = (pendingLeaveRes?.results ?? []).map((l) => ({
      id: l.id,
      leave_type: l.leave_type,
      days_requested: l.days_requested,
      start_date: l.start_date,
      end_date: l.end_date,
      employee: null,
    }))

    return NextResponse.json({
      data: {
        activeEmployees:  empRes?.count           ?? 0,
        onLeaveToday:     leaveRes?.results?.length ?? 0,
        contractExpiries,
        pendingLeave,
      },
    })
  } catch (err) {
    console.error('[summary] route error:', err instanceof HRApiError ? err.message : err)
    return NextResponse.json(FALLBACK)
  }
}
