export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await djangoGet(`/careers/jobs/${params.id}/`)
  if (error || !data) return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
  return NextResponse.json({ data })
}
