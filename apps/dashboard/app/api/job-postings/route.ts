export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const params: Record<string, string> = {}
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    if (companyId) params.company_id = companyId
    if (status) params.status = status
    if (search) params.search = search

    const res = await hrApi<DRFList<unknown>>('/job-postings/', { params })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await hrApi('/job-postings/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
