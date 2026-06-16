export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

interface MedicalRecordRow {
  id: string
  employee_id: string
  [key: string]: unknown
}
interface EmployeeRow { id: string; employee_number: string }
interface UserRow { employee_id: string | null; full_name: string; avatar_url: string | null }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined

  const { data: records, error } = await djangoGet<MedicalRecordRow[]>('/medical-records/', { company_id: companyId })
  if (error) return NextResponse.json({ data: [] })

  const list = records ?? []
  if (!list.length) return NextResponse.json({ data: [] })

  const [{ data: employees }, { data: users }] = await Promise.all([
    djangoGet<EmployeeRow[]>('/all-employees/', { company_id: companyId, page_size: 1000 }),
    djangoGet<UserRow[]>('/users/', { company_id: companyId }),
  ])
  const empById = new Map((employees ?? []).map((e) => [e.id, e]))
  const userByEmpId = new Map((users ?? []).filter((u) => u.employee_id).map((u) => [u.employee_id as string, u]))

  const data = list.map((rec) => ({
    ...rec,
    employee: {
      employee_number: empById.get(rec.employee_id)?.employee_number ?? '',
      user: {
        full_name: userByEmpId.get(rec.employee_id)?.full_name ?? 'Unknown',
        avatar_url: userByEmpId.get(rec.employee_id)?.avatar_url ?? null,
      },
    },
  }))

  return NextResponse.json({ data })
}
