export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet } from '@/lib/django-client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const { data, error } = await djangoGet(session, '/me/payslips/', { employee_id: session.employeeId, limit: 24 })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
