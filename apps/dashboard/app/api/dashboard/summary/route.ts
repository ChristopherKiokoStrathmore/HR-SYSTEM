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
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  const supabase = createServerClient(true)
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [empRes, leaveRes, contractRes, pendingLeaveRes] = await Promise.all([
    (supabase.from('employee_profiles') as any)
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('employment_status', 'active')
      .eq('is_deleted', false),

    (supabase.from('leaves') as any)
      .select('status')
      .eq('company_id', companyId)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .eq('is_deleted', false),

    (supabase.from('employee_profiles') as any)
      .select('id, user:users!user_id(full_name), job_title, end_date')
      .eq('company_id', companyId)
      .eq('employment_status', 'active')
      .eq('is_deleted', false)
      .not('end_date', 'is', null)
      .lte('end_date', in30)
      .gte('end_date', today)
      .order('end_date')
      .limit(5),

    (supabase.from('leaves') as any)
      .select('id, leave_type, days_requested, start_date, end_date, employee:employee_profiles!employee_id(user:users!user_id(full_name))')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  return NextResponse.json({
    data: {
      activeEmployees: empRes.count ?? 0,
      onLeaveToday: (leaveRes.data as LeaveRow[] ?? []).length,
      contractExpiries: contractRes.data ?? [],
      pendingLeave: pendingLeaveRes.data ?? [],
    },
  })
}
