export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { data, count, error } = await djangoGet('/job-postings/', {
    company_id: searchParams.get('companyId') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data, count: count ?? 0 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/job-postings/', body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
