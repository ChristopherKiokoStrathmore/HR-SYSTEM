export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface ContractRow {
  id: string
  user: { full_name: string } | null
  job_title: string
  end_date: string
}

interface PendingLeaveRow {
  id: string
  leave_type: string
  days_requested: number
  start_date: string
  end_date: string
  employee: { user: { full_name: string } | null } | null
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const supabase = createServerClient(true)
    const today = new Date().toISOString().split('T')[0]
    const in30  = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function q(table: string) { return supabase.from(table) as any }
    function applyCompany(query: any) {
      return companyId ? query.eq('company_id', companyId) : query
    }

    const [empRes, leaveRes, contractRes, pendingLeaveRes] = await Promise.all([
      // Active employee count — use limit(0) so no rows are transferred but count is accurate
      applyCompany(
        q('employee_profiles')
          .select('id', { count: 'exact' })
          .eq('employment_status', 'active')
          .neq('is_deleted', true)
          .limit(0)
      ),

      // Who is on leave today
      applyCompany(
        q('leaves')
          .select('id')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today)
          .neq('is_deleted', true)
      ),

      // Contracts expiring in next 30 days
      applyCompany(
        q('employee_profiles')
          .select('id, user:users!user_id(full_name), job_title, end_date')
          .eq('employment_status', 'active')
          .neq('is_deleted', true)
          .not('end_date', 'is', null)
          .lte('end_date', in30)
          .gte('end_date', today)
          .order('end_date')
          .limit(5)
      ),

      // Pending leave approvals
      applyCompany(
        q('leaves')
          .select('id, leave_type, days_requested, start_date, end_date, employee:employee_profiles!employee_id(user:users!user_id(full_name))')
          .eq('status', 'pending')
          .neq('is_deleted', true)
          .order('created_at', { ascending: false })
          .limit(10)
      ),
    ])

    // Surface any Supabase-level errors in the dev terminal
    if (empRes.error)          console.error('[summary] employees:', empRes.error.message)
    if (leaveRes.error)        console.error('[summary] on-leave:', leaveRes.error.message)
    if (contractRes.error)     console.error('[summary] contracts:', contractRes.error.message)
    if (pendingLeaveRes.error) console.error('[summary] pending-leave:', pendingLeaveRes.error.message)

    // Dev-only: log actual values so we can see what came back
    if (process.env.NODE_ENV === 'development') {
      console.log('[summary] companyId:', companyId)
      console.log('[summary] activeEmployees:', empRes.count)
      console.log('[summary] onLeaveToday:', leaveRes.data?.length)
      console.log('[summary] contractExpiries:', contractRes.data?.length)
      console.log('[summary] pendingLeave:', pendingLeaveRes.data?.length)
    }

    return NextResponse.json({
      data: {
        activeEmployees:  empRes.count           ?? 0,
        onLeaveToday:     leaveRes.data?.length   ?? 0,
        contractExpiries: (contractRes.data        ?? []) as ContractRow[],
        pendingLeave:     (pendingLeaveRes.data    ?? []) as PendingLeaveRow[],
      },
    })
  } catch (err) {
    console.error('[summary] route error:', err)
    return NextResponse.json({
      data: { activeEmployees: 0, onLeaveToday: 0, contractExpiries: [], pendingLeave: [] },
      error: 'Failed to fetch dashboard summary',
    })
  }
}
