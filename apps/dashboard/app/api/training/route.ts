export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  if (!employeeId) return NextResponse.json({ data: [] })

  const { data, error } = await djangoGet('/training-enrollments/', { employee_id: employeeId })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
