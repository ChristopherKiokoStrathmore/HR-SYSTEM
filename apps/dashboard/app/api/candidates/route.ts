export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const jobPostingId = searchParams.get('jobPostingId')
  const stage = searchParams.get('stage')
  const search = searchParams.get('search')

  const params: Record<string, string> = {}
  if (jobPostingId) params.job_posting_id = jobPostingId
  if (stage) params.current_stage = stage
  if (search) params.search = search

  try {
    const res = await hrApi<DRFList<unknown>>('/candidates/', { params })
    return NextResponse.json({ data: res.results, count: res.count })
  } catch (err) {
    console.error('Candidates GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await hrApi<unknown>('/candidates/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Candidates POST route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
