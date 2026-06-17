export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }
interface UserRow { id: string; full_name: string; email: string; avatar_url: string | null; phone: string | null; preferred_language: string }
interface CompanyRow { id: string; name: string; logo_url: string | null }
interface ProfileRow { id: string; user_id: string; company_id: string; manager_id: string | null; [key: string]: unknown }

async function enrichProfiles(profiles: ProfileRow[]) {
  if (profiles.length === 0) return []

  const userIds = [...new Set(profiles.map(p => p.user_id).filter(Boolean))]
  const companyIds = [...new Set(profiles.map(p => p.company_id).filter(Boolean))]
  const managerIds = [...new Set(profiles.map(p => p.manager_id).filter(Boolean))]

  const [usersRes, companiesRes] = await Promise.all([
    hrApi<DRFList<UserRow>>('/users/', { params: { page_size: '200' } }),
    hrApi<DRFList<CompanyRow>>('/companies/', { params: { page_size: '100' } }),
  ])

  const userMap = Object.fromEntries((usersRes.results ?? []).map(u => [u.id, u]))
  const companyMap = Object.fromEntries((companiesRes.results ?? []).map(c => [c.id, c]))

  return profiles.map(p => ({
    ...p,
    user: p.user_id ? userMap[p.user_id] ?? null : null,
    company: p.company_id ? companyMap[p.company_id] ?? null : null,
    manager: p.manager_id ? { full_name: userMap[p.manager_id]?.full_name ?? null } : null,
  }))
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = searchParams.get('page') ?? '1'
    const pageSize = searchParams.get('pageSize') ?? '25'
    const search = searchParams.get('search') ?? ''
    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const employmentType = searchParams.get('employmentType')

    const params: Record<string, string> = { page, page_size: pageSize }
    if (search) params.search = search
    if (companyId) params.company_id = companyId
    if (status) params.employment_status = status
    if (department) params.department = department
    if (employmentType) params.employment_type = employmentType

    const res = await hrApi<DRFList<ProfileRow>>('/all-employees/', { params })
    const enriched = await enrichProfiles(res.results ?? [])

    return NextResponse.json({ data: enriched, count: res.count, page: parseInt(page), pageSize: parseInt(pageSize) })
  } catch (err) {
    console.error('[employees] GET error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = await hrApi('/all-employees/', { method: 'POST', body })
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message, details: err.data }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
