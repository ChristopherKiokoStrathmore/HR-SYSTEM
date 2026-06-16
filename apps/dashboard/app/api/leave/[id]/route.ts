export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await djangoGet(`/leave/${params.id}/`)
  if (error) return NextResponse.json({ error }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as { action: 'approve' | 'reject'; rejection_reason?: string }
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 })
  }
  const { data, error } = await djangoPost(`/leave/${params.id}/${body.action}/`, {
    rejection_reason: body.rejection_reason,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
