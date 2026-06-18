export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

interface Employee {
  id: string
  user_id: string
  company_id: string
  employee_number: string
  job_title: string
  department: string | null
  start_date: string
  employment_status: string
}

interface UserRow {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
}

interface CompanyRow {
  id: string
  name: string
}

interface OnboardingDocument {
  employee_id: string
  type: string
  status: string
}

const REQUIRED_DOCS = ['id', 'nssf', 'nhif', 'kra', 'bank_details', 'contract']

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 4)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const [employeesRes, docsRes, usersRes, companiesRes] = await Promise.all([
      hrApi<DRFList<Employee>>('/all-employees/', {
        params: { page_size: '200', start_date_after: cutoffStr },
      }),
      hrApi<DRFList<OnboardingDocument>>('/onboarding-documents/', {
        params: { page_size: '500' },
      }).catch(() => ({ count: 0, results: [] as OnboardingDocument[] })),
      hrApi<DRFList<UserRow>>('/users/', { params: { page_size: '200' } }),
      hrApi<DRFList<CompanyRow>>('/companies/', { params: { page_size: '100' } }),
    ])

    const userMap = new Map<string, UserRow>(
      (usersRes.results ?? []).map((u) => [u.id, u])
    )
    const companyMap = new Map<string, CompanyRow>(
      (companiesRes.results ?? []).map((c) => [c.id, c])
    )

    let employees = employeesRes.results ?? []
    const docs = docsRes.results ?? []

    if (companyId) {
      employees = employees.filter((emp) => emp.company_id === companyId)
    }

    const enriched = employees.map((emp) => {
      const empDocs = docs.filter((d) => d.employee_id === emp.id)
      const verified = empDocs.filter(
        (d) => REQUIRED_DOCS.includes(d.type) && d.status === 'verified'
      ).length
      const uploaded = empDocs.filter((d) => REQUIRED_DOCS.includes(d.type)).length
      const u = userMap.get(emp.user_id)
      const c = companyMap.get(emp.company_id)
      return {
        id: emp.id,
        employee_number: emp.employee_number,
        job_title: emp.job_title,
        department: emp.department,
        start_date: emp.start_date,
        employment_status: emp.employment_status,
        user: {
          full_name: u?.full_name ?? emp.employee_number,
          email: u?.email ?? '',
          avatar_url: u?.avatar_url ?? null,
        },
        company: { name: c?.name ?? '' },
        doc_verified: verified,
        doc_uploaded: uploaded,
        doc_required: REQUIRED_DOCS.length,
        doc_pct: Math.round((verified / REQUIRED_DOCS.length) * 100),
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error('[onboarding] GET error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
