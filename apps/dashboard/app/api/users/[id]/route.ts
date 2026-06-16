export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPatch } from '@/lib/django-client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await djangoGet(`/users/${params.id}/`)
  if (error) return NextResponse.json({ error }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { data, error } = await djangoPatch(`/users/${params.id}/`, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
