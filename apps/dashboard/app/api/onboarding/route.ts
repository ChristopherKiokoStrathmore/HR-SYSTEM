export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

interface Employee {
  id: string
  employee_number: string
  job_title: string
  department: string | null
  start_date: string
  employment_status: string
  company_id: string
  full_name?: string
  email?: string
  avatar_url?: string | null
  company_name?: string
  [key: string]: unknown
}

interface OnboardingDocument {
  employee_id: string
  type: string
  status: string
  [key: string]: unknown
}

const REQUIRED_DOCS = ['id', 'nssf', 'nhif', 'kra', 'bank_details', 'contract']

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 4)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    // Fetch employees hired within the last 4 years
    const [employeesRes, docsRes] = await Promise.all([
      hrApi<DRFList<Employee>>('/all-employees/', {
        params: { page_size: '200', start_date_after: cutoffStr },
      }),
      hrApi<DRFList<OnboardingDocument>>('/onboarding-documents/', {
        params: { page_size: '500' },
      }),
    ])

    let employees = employeesRes.results ?? []
    const docs = docsRes.results ?? []

    // Filter by company if provided
    if (companyId) {
      employees = employees.filter((emp) => emp.company_id === companyId)
    }

    // Merge: for each employee, find their documents and compute doc stats
    const enriched = employees.map((emp) => {
      const empDocs = docs.filter((d) => d.employee_id === emp.id)
      const verified = empDocs.filter(
        (d) => REQUIRED_DOCS.includes(d.type) && d.status === 'verified'
      ).length
      const uploaded = empDocs.filter((d) => REQUIRED_DOCS.includes(d.type)).length
      return {
        ...emp,
        documents: empDocs,
        doc_verified: verified,
        doc_uploaded: uploaded,
        doc_required: REQUIRED_DOCS.length,
        doc_pct: Math.round((verified / REQUIRED_DOCS.length) * 100),
      }
    })

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error('Onboarding GET route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json(
        { error: err.message, details: 'Failed to fetch onboarding data' },
        { status: err.status }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    )
  }
}
