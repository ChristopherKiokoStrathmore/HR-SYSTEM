export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { createEmployeeSchema } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25')
  const search = searchParams.get('search') ?? ''
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const department = searchParams.get('department')
  const employmentType = searchParams.get('employmentType')

  let query = supabase
    .from('employee_profiles')
    .select(
      `
      *,
      user:users!user_id(full_name, email, avatar_url, phone, preferred_language),
      manager:users!manager_id(full_name),
      company:companies!company_id(name, logo_url)
    `,
      { count: 'exact' }
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (companyId) query = query.eq('company_id', companyId)
  if (status) query = query.eq('employment_status', status)
  if (department) query = query.eq('department', department)
  if (employmentType) query = query.eq('employment_type', employmentType)
  if (search) {
    query = query.or(
      `employee_number.ilike.%${search}%,department.ilike.%${search}%,job_title.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(true)
  const body = await req.json()

  const parsed = createEmployeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const {
    full_name,
    email,
    phone,
    preferred_language,
    // rest goes to employee_profiles
    ...profileData
  } = parsed.data

  // 1. Create auth user (invite)
  const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role: 'employee' },
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  const userId = authUser.user.id

  // 2. Create user profile row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: userError } = await (supabase.from('users') as any).insert({
    id: userId,
    full_name,
    email,
    phone: phone ?? null,
    role: 'employee',
    company_id: profileData.company_id,
    preferred_language: preferred_language ?? 'en',
    is_active: true,
    tenant_id: profileData.company_id,
  })
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })

  // 3. Create employee profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: profileError } = await (supabase.from('employee_profiles') as any)
    .insert({
      ...profileData,
      user_id: userId,
      tenant_id: profileData.company_id,
    })
    .select()
    .single()

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  // 4. Seed leave balances for current year
  const year = new Date().getFullYear()
  const leaveTypes = ['annual', 'sick', 'maternity', 'paternity', 'study', 'compassionate', 'unpaid'] as const
  const defaultDays: Record<string, number> = {
    annual: 21, sick: 14, maternity: 90, paternity: 14,
    study: 10, compassionate: 5, unpaid: 30,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('leave_balances') as any).insert(
    leaveTypes.map((t) => ({
      employee_id: profile.id,
      leave_type: t,
      year,
      total_days: defaultDays[t],
      used_days: 0,
      remaining_days: defaultDays[t],
      tenant_id: profileData.company_id,
    }))
  )

  return NextResponse.json({ data: profile }, { status: 201 })
}
