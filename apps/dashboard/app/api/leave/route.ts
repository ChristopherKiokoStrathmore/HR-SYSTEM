export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const leaveType = searchParams.get('leaveType')

  // Must filter by either employee or company
  if (!employeeId && !companyId) {
    return NextResponse.json({ error: 'employeeId or companyId required' }, { status: 400 })
  }

  let query = supabase
    .from('leaves')
    .select(`
      *,
      employee:employee_profiles(
        employee_number, job_title,
        user:users(full_name, email)
      )
    `)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (employeeId) query = query.eq('employee_id', employeeId)
  if (companyId) query = query.eq('company_id', companyId)
  if (status) query = query.eq('status', status)
  if (leaveType) query = query.eq('leave_type', leaveType)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(true)
  const body = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('leaves') as any)
    .insert({ ...body, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
