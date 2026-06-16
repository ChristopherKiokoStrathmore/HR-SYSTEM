export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

interface RunRow {
  id: string
  period_month: number
  period_year: number
  total_gross: number | string
  total_deductions: number | string
  total_net: number | string
  status: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined

  const { data, error } = await djangoGet('/payroll-runs/', {
    company_id: companyId,
    page_size: 12,
    ordering: '-period_year,-period_month',
  })

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const runs = ((data as RunRow[]) ?? []).reverse()
  const trend = runs.map(r => ({
    month: `${MONTHS[r.period_month - 1]} ${String(r.period_year).slice(-2)}`,
    gross: Number(r.total_gross),
    deductions: Number(r.total_deductions),
    net: Number(r.total_net),
  }))

  const latest = runs[runs.length - 1] ?? null
  return NextResponse.json({ data: { trend, latest, runs } })
}
