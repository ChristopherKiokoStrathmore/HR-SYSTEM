export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '25')
  const search = searchParams.get('search') ?? ''
  const companyId = searchParams.get('companyId') ?? ''
  const status = searchParams.get('status') ?? ''
  const department = searchParams.get('department') ?? ''
  const employmentType = searchParams.get('employmentType') ?? ''

  const { data, count, error } = await djangoGet('/all-employees/', {
    page,
    page_size: pageSize,
    search: search || undefined,
    companyId: companyId || undefined,
    status: status || undefined,
    department: department || undefined,
    employmentType: employmentType || undefined,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/all-employees/', {
    ...body,
    tenant_id: body.company_id,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
