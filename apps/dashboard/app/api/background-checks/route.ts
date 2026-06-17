export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'
import { checkRateLimit } from '@/lib/rate-limit'

interface DRFList<T> { count: number; results: T[] }

/**
 * GET /api/background-checks
 * List background checks with optional filters
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const checkType = searchParams.get('checkType')
  const employeeId = searchParams.get('employeeId')
  const candidateId = searchParams.get('candidateId')
  const page = searchParams.get('page') ?? '1'
  const pageSize = searchParams.get('pageSize') ?? '25'

  const params: Record<string, string> = {
    page,
    page_size: pageSize,
  }
  if (companyId) params.company_id = companyId
  if (status) params.status = status
  if (checkType) params.check_type = checkType
  if (employeeId) params.employee_id = employeeId
  if (candidateId) params.candidate_id = candidateId

  try {
    const res = await hrApi<DRFList<unknown>>('/background-checks/', { params })
    const parsedPage = parseInt(page, 10)
    const parsedPageSize = parseInt(pageSize, 10)
    return NextResponse.json({
      data: res.results,
      count: res.count,
      page: parsedPage,
      pageSize: parsedPageSize,
      totalPages: Math.ceil((res.count ?? 0) / parsedPageSize),
    })
  } catch (err) {
    console.error('Background checks GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message, data: [] }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}

/**
 * POST /api/background-checks
 * Create a new background check request
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const body = await req.json()
    const data = await hrApi<unknown>('/background-checks/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Background checks POST route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
