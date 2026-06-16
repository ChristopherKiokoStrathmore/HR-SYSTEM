export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined

  const { data, error } = await djangoGet('/payroll-documents/', { company_id: companyId })
  if (error) return NextResponse.json({ error, data: [] }, { status: 200 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/payroll-documents/', body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
