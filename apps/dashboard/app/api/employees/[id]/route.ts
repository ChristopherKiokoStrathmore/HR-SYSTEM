export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }
interface UserRow { id: string; full_name: string; email: string; avatar_url: string | null; phone: string | null; preferred_language: string; last_login_at?: string | null }
interface CompanyRow { id: string; name: string; logo_url: string | null; primary_color?: string | null }

async function withUserAndCompany(profile: Record<string, unknown>) {
  const [usersRes, companiesRes] = await Promise.all([
    hrApi<DRFList<UserRow>>('/users/', { params: { page_size: '200' } }),
    hrApi<DRFList<CompanyRow>>('/companies/', { params: { page_size: '100' } }),
  ])
  const userMap = Object.fromEntries((usersRes.results ?? []).map(u => [u.id, u]))
  const companyMap = Object.fromEntries((companiesRes.results ?? []).map(c => [c.id, c]))
  return {
    ...profile,
    user: profile.user_id ? userMap[profile.user_id as string] ?? null : null,
    company: profile.company_id ? companyMap[profile.company_id as string] ?? null : null,
    manager: profile.manager_id ? { full_name: userMap[profile.manager_id as string]?.full_name ?? null } : null,
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const profile = await hrApi<Record<string, unknown>>(`/all-employees/${params.id}/`)
    const data = await withUserAndCompany(profile)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { full_name, email, phone, preferred_language, avatar_url, ...profileData } = body

    // Update user fields if provided
    const userFields: Record<string, unknown> = {}
    if (full_name !== undefined) userFields.full_name = full_name
    if (phone !== undefined) userFields.phone = phone
    if (preferred_language !== undefined) userFields.preferred_language = preferred_language
    if (avatar_url !== undefined) userFields.avatar_url = avatar_url

    const profileRes = await hrApi<Record<string, unknown>>(`/all-employees/${params.id}/`)
    const userId = profileRes.user_id as string | undefined

    await Promise.all([
      Object.keys(profileData).length > 0
        ? hrApi(`/all-employees/${params.id}/`, { method: 'PATCH', body: profileData })
        : Promise.resolve(),
      userId && Object.keys(userFields).length > 0
        ? hrApi(`/users/${userId}/`, { method: 'PATCH', body: userFields })
        : Promise.resolve(),
    ])

    const updated = await hrApi<Record<string, unknown>>(`/all-employees/${params.id}/`)
    const data = await withUserAndCompany(updated)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}
