export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface RunRow {
  id: string
  period_month: number
  period_year: number
  total_gross: number
  total_deductions: number
  total_net: number
  status: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const supabase = createServerClient(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let psQuery = (supabase.from('payroll_runs') as any)
    .select('id, period_month, period_year, total_gross, total_deductions, total_net, status')
    .eq('is_deleted', false)
  if (companyId) psQuery = psQuery.eq('company_id', companyId)
  const { data, error } = await psQuery
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })
    .limit(12) as { data: RunRow[] | null; error: unknown }

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const runs = (data ?? []).reverse()
  const trend = runs.map((r) => ({
    month: `${MONTHS[r.period_month - 1]} ${String(r.period_year).slice(-2)}`,
    gross: r.total_gross,
    deductions: r.total_deductions,
    net: r.total_net,
  }))

  const latest = runs[runs.length - 1] ?? null

  return NextResponse.json({ data: { trend, latest, runs } })
}
