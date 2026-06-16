export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

  if (!companyId) return NextResponse.json({ data: [] })

  const { data, error } = await djangoGet('/attendance-events/', {
    company_id: companyId,
    date,
    has_location: 'true',
    page_size: 200,
  })

  if (error) return NextResponse.json({ data: [], error })
  return NextResponse.json({ data: data ?? [] })
}
