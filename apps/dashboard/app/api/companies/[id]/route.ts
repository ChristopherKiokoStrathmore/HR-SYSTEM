export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPatch } from '@/lib/django-client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await djangoGet(`/companies/${params.id}/`)
  if (error) return NextResponse.json({ error }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { data, error } = await djangoPatch(`/companies/${params.id}/`, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await djangoPatch(`/companies/${params.id}/`, { is_active: false })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}
