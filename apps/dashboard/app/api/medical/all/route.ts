export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase.from('medical_records') as any)
    .select(`
      *,
      employee:employee_profiles!inner(
        employee_number,
        user:users!user_id(full_name, avatar_url)
      )
    `)
    .eq('is_deleted', false)
    .order('issued_date', { ascending: false })

  if (companyId) {
    query = query.eq('employee_profiles.company_id', companyId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
