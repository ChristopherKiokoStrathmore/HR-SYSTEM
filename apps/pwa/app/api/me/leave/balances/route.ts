export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const year = new URL(req.url).searchParams.get('year') ?? new Date().getFullYear().toString()

  const { data, error } = await djangoGet(session, '/leave-balances/', {
    employee_id: session.employeeId,
    year,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
