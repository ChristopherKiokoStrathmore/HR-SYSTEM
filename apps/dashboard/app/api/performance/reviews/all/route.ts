export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('performance_reviews') as any)
    .select(`
      *,
      employee:employee_profiles!inner(
        employee_number, job_title,
        user:users!user_id(full_name, avatar_url)
      ),
      reviewer:users!reviewer_id(full_name)
    `)
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('employee_profiles.company_id', companyId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
