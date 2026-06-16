export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

interface ReviewRow { id: string; employee_id: string; reviewer_id: string | null; [key: string]: unknown }
interface EmployeeRow { id: string; employee_number: string; job_title: string }
interface UserRow { id: string; employee_id: string | null; full_name: string; avatar_url: string | null }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined

  const { data: reviews, error } = await djangoGet<ReviewRow[]>('/performance-reviews/', { company_id: companyId })
  if (error) return NextResponse.json({ data: [] })

  const list = reviews ?? []
  if (!list.length) return NextResponse.json({ data: [] })

  const [{ data: employees }, { data: users }] = await Promise.all([
    djangoGet<EmployeeRow[]>('/all-employees/', { company_id: companyId, page_size: 1000 }),
    djangoGet<UserRow[]>('/users/', { company_id: companyId }),
  ])
  const empById = new Map((employees ?? []).map((e) => [e.id, e]))
  const userByEmpId = new Map((users ?? []).filter((u) => u.employee_id).map((u) => [u.employee_id as string, u]))
  const userById = new Map((users ?? []).map((u) => [u.id, u]))

  const data = list.map((r) => {
    const emp = empById.get(r.employee_id)
    const empUser = userByEmpId.get(r.employee_id)
    return {
      ...r,
      employee: {
        employee_number: emp?.employee_number ?? '',
        job_title: emp?.job_title ?? '',
        user: { full_name: empUser?.full_name ?? 'Unknown', avatar_url: empUser?.avatar_url ?? null },
      },
      reviewer: r.reviewer_id ? { full_name: userById.get(r.reviewer_id)?.full_name ?? 'Unknown' } : undefined,
    }
  })
  return NextResponse.json({ data })
}
