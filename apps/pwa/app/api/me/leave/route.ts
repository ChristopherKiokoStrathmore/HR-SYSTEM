export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? undefined

  const { data, error } = await djangoGet(session, '/leave/', {
    employee_id: session.employeeId,
    status,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const body = await req.json()
  // HR notification on submit is handled server-side by Django
  // (LeaveRequestViewSet.perform_create), not here.
  const { data, error } = await djangoPost(session, '/leave/', {
    ...body,
    employee_id: session.employeeId,
    company_id: session.companyId,
    status: 'pending',
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
