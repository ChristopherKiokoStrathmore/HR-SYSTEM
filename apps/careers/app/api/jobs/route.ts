export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET() {
  const { data, error } = await djangoGet('/careers/jobs/')
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
