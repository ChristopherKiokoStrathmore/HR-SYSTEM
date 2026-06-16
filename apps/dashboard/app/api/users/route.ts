export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const { data, error } = await djangoGet('/users/', {
    company_id: searchParams.get('companyId') || undefined,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
