export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet } from '@/lib/django-client'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.companyId) return NextResponse.json({ data: [] })

  const { data, error } = await djangoGet(session, '/announcements/')
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
