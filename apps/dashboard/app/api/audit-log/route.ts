export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined
  const limit = parseInt(searchParams.get('limit') ?? '100', 10)

  const { data, error } = await djangoGet('/audit/', {
    company_id: companyId,
    page_size: Math.min(limit, 500),
  })

  if (error) return NextResponse.json({ error, data: [] }, { status: 200 })
  return NextResponse.json({ data: data ?? [] })
}
