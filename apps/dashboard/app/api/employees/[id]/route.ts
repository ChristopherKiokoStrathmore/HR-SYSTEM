export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPatch } from '@/lib/django-client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await djangoGet(`/all-employees/${params.id}/`)
  if (error) return NextResponse.json({ error }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  // Profile fields only — user auth fields (email, avatar_url) not stored in Django
  const { full_name, email, avatar_url, preferred_language, ...profileData } = body
  void full_name; void email; void avatar_url; void preferred_language
  const { data, error } = await djangoPatch(`/all-employees/${params.id}/`, profileData)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
