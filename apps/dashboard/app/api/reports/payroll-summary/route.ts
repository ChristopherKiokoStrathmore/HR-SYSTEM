export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi } from '@/lib/hr-api'

interface DRFList<T> {
  count: number
  results: T[]
}

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

const EMPTY_RESPONSE = { data: { trend: [], latest: null, runs: [] } }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  const params: Record<string, string | number> = { page_size: 12 }
  if (companyId) params.company_id = companyId

  let res: DRFList<RunRow> | null = null
  try {
    res = await hrApi<DRFList<RunRow>>('/payroll-runs/', { params })
  } catch (err) {
    // Django currently returns 500 on this endpoint — return empty data gracefully
    console.error('[payroll-summary] fetch error (expected — endpoint not ready):', err)
    return NextResponse.json(EMPTY_RESPONSE)
  }

  if (!res) return NextResponse.json(EMPTY_RESPONSE)

  // Sort ascending by year then month, then build trend
  const runs = (res.results ?? [])
    .slice()
    .sort((a, b) => a.period_year !== b.period_year ? a.period_year - b.period_year : a.period_month - b.period_month)

  const trend = runs.map((r) => ({
    month: `${MONTHS[r.period_month - 1]} ${String(r.period_year).slice(-2)}`,
    gross: r.total_gross,
    deductions: r.total_deductions,
    net: r.total_net,
  }))

  const latest = runs[runs.length - 1] ?? null

  return NextResponse.json({ data: { trend, latest, runs } })
}
