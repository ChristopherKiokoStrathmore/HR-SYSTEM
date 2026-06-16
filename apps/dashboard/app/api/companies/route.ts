export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20')
  const search = searchParams.get('search') ?? ''

  const { data, count, error } = await djangoGet('/companies/', {
    page,
    page_size: pageSize,
    search: search || undefined,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/companies/', {
    ...body,
    tenant_id: body.tenant_id ?? crypto.randomUUID(),
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
