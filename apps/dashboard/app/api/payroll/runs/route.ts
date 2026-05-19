export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSessionUserId } from '@/lib/get-session-user'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  let query = supabase
    .from('payroll_runs')
    .select('*')
    .eq('is_deleted', false)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  const supabase = createServerClient(true)
  const body = await req.json()
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('payroll_runs') as any)
    .insert({
      company_id: body.company_id,
      period_month: body.period_month,
      period_year: body.period_year,
      status: 'draft',
      total_gross: 0,
      total_deductions: 0,
      total_net: 0,
      run_by: userId,
      tenant_id: body.company_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
