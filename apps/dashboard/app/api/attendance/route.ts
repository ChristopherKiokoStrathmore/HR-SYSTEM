export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined

  const { data, error } = await djangoGet('/attendance-events/', {
    employee_id: employeeId ?? undefined,
    from,
    to,
    page_size: 60,
  })

  if (error) return NextResponse.json({ error, data: [] }, { status: 200 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/attendance/check-in/', body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
