export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoPatch } from '@/lib/django-client'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { data, error } = await djangoPatch(`/payroll-documents/${params.id}/`, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await djangoPatch(`/payroll-documents/${params.id}/`, { is_deleted: true })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}
