export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined

  const { data, count, error } = await djangoGet('/payroll-runs/', {
    company_id: companyId,
    page_size: 50,
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: data ?? [], count: count ?? 0 })
}
