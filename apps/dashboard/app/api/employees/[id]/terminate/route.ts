export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoPost } from '@/lib/django-client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { data, error } = await djangoPost(`/all-employees/${params.id}/terminate/`, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
