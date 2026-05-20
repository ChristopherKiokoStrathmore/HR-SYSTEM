export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface LeaveRow { status: string }
interface ContractRow {
  id: string
  user: { full_name: string } | null
  job_title: string
  end_date: string
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const supabase = createServerClient(true)
    const today = new Date().toISOString().split('T')[0]
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyCompany(q: any) { return companyId ? q.eq('company_id', companyId) : q }

    const [empRes, leaveRes, contractRes, pendingLeaveRes] = await Promise.all([
      applyCompany(
        (supabase.from('employee_profiles') as any)
          .select('id', { count: 'exact', head: true })
          .eq('employment_status', 'active')
          .eq('is_deleted', false)
      ).catch(() => ({ count: 0, error: true })),

      applyCompany(
        (supabase.from('leaves') as any)
          .select('status')
          .eq('status', 'approved')
          .lte('start_date', today)
          .gte('end_date', today)
          .eq('is_deleted', false)
      ).catch(() => ({ data: [], error: true })),

      applyCompany(
        (supabase.from('employee_profiles') as any)
          .select('id, user:users!user_id(full_name), job_title, end_date')
          .eq('employment_status', 'active')
          .eq('is_deleted', false)
          .not('end_date', 'is', null)
          .lte('end_date', in30)
          .gte('end_date', today)
          .order('end_date')
          .limit(5)
      ).catch(() => ({ data: [], error: true })),

      applyCompany(
        (supabase.from('leaves') as any)
          .select('id, leave_type, days_requested, start_date, end_date, employee:employee_profiles!employee_id(user:users!user_id(full_name))')
          .eq('status', 'pending')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(5)
      ).catch(() => ({ data: [], error: true })),
    ])

    return NextResponse.json({
      data: {
        activeEmployees: empRes.count ?? 0,
        onLeaveToday: (leaveRes.data as LeaveRow[] ?? []).length,
        contractExpiries: contractRes.data ?? [],
        pendingLeave: pendingLeaveRes.data ?? [],
      },
    })
  } catch (err) {
    console.error('Dashboard summary GET route error:', err)
    return NextResponse.json({
      data: {
        activeEmployees: 0,
        onLeaveToday: 0,
        contractExpiries: [],
        pendingLeave: [],
      },
      error: 'Failed to fetch dashboard summary',
    })
  }
}
