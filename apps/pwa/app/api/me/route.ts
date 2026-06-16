export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet } from '@/lib/django-client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const [{ data: employee }, { data: company }] = await Promise.all([
    djangoGet<Record<string, unknown>>(session, `/all-employees/${session.employeeId}/`),
    session.companyId
      ? djangoGet<{ name: string; logo_url: string | null }>(session, `/companies/${session.companyId}/`)
      : Promise.resolve({ data: null, error: null, status: 200 }),
  ])

  const user = {
    id: session.userId,
    full_name: session.fullName,
    email: session.email,
    role: session.role,
  }

  const employeeWithCompany = employee
    ? { ...employee, company: company ? { name: company.name, logo_url: company.logo_url } : null }
    : null

  return NextResponse.json({ data: { user, employee: employeeWithCompany } })
}
