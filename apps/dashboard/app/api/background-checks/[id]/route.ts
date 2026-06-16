export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPatch } from '@/lib/django-client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await djangoGet(`/background-checks/${params.id}/`)
  if (error) return NextResponse.json({ error }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json() as { status?: string; result_summary?: string }
  // Full review (passed/failed/flagged + a result summary) goes through the
  // `review` action, which stamps completed_at/reviewed_by; simpler status
  // transitions (e.g. -> in_progress) are a plain field update.
  const isReview = ['passed', 'failed', 'flagged'].includes(body.status ?? '') && body.result_summary
  const path = isReview ? `/background-checks/${params.id}/review/` : `/background-checks/${params.id}/`
  const { data, error } = await djangoPatch(path, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await djangoPatch(`/background-checks/${params.id}/`, { is_deleted: true })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}
