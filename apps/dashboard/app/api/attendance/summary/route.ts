export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

  const { data: rows, error } = await djangoGet('/attendance-events/', {
    company_id: companyId,
    date,
    page_size: 500,
  })

  if (error) {
    return NextResponse.json({ data: [], stats: { present: 0, absent: 0, late: 0, total: 0 }, error }, { status: 200 })
  }

  const list = (rows as Array<{ status?: string; is_late?: boolean }>) ?? []
  const present = list.filter(r => r.status === 'present').length
  const absent = list.filter(r => r.status === 'absent').length
  const late = list.filter(r => r.is_late).length
  return NextResponse.json({ data: list, stats: { present, absent, late, total: list.length } })
}
