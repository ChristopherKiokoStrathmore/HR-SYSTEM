export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

interface BackgroundCheckRow {
  id: string
  employee_id: string | null
  candidate_id: string | null
  [key: string]: unknown
}
interface EmployeeRow { id: string; employee_number: string }
interface UserRow { employee_id: string | null; full_name: string; email: string }
interface CandidateRow { id: string; full_name: string; email: string }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25')

  const { data: checks, count, error } = await djangoGet<BackgroundCheckRow[]>('/background-checks/', {
    company_id: companyId,
    status: searchParams.get('status') || undefined,
    check_type: searchParams.get('checkType') || undefined,
    employee_id: searchParams.get('employeeId') || undefined,
    candidate_id: searchParams.get('candidateId') || undefined,
    expiring_within_days: searchParams.get('expiringWithinDays') || undefined,
    page,
    page_size: pageSize,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })

  const list = checks ?? []
  const empIds = list.map((c) => c.employee_id).filter(Boolean) as string[]
  const candIds = list.map((c) => c.candidate_id).filter(Boolean) as string[]

  const [{ data: employees }, { data: users }, { data: candidates }] = await Promise.all([
    empIds.length ? djangoGet<EmployeeRow[]>('/all-employees/', { company_id: companyId, page_size: 1000 }) : Promise.resolve({ data: [], error: null, status: 200 }),
    empIds.length ? djangoGet<UserRow[]>('/users/', { company_id: companyId }) : Promise.resolve({ data: [], error: null, status: 200 }),
    candIds.length ? djangoGet<CandidateRow[]>('/candidates/', { page_size: 1000 }) : Promise.resolve({ data: [], error: null, status: 200 }),
  ])
  const empById = new Map((employees ?? []).map((e) => [e.id, e]))
  const userByEmpId = new Map((users ?? []).filter((u) => u.employee_id).map((u) => [u.employee_id as string, u]))
  const candById = new Map((candidates ?? []).map((c) => [c.id, c]))

  const data = list.map((c) => ({
    ...c,
    employee: c.employee_id ? {
      employee_number: empById.get(c.employee_id)?.employee_number ?? '',
      user: {
        full_name: userByEmpId.get(c.employee_id)?.full_name ?? 'Unknown',
        email: userByEmpId.get(c.employee_id)?.email ?? '',
      },
    } : null,
    candidate: c.candidate_id ? {
      full_name: candById.get(c.candidate_id)?.full_name ?? 'Unknown',
      email: candById.get(c.candidate_id)?.email ?? '',
    } : null,
  }))

  return NextResponse.json({ data, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/background-checks/', body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
