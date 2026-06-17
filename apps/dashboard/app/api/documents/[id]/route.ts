export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { status, verified_by, rejection_reason } = body as {
      status?: string
      verified_by?: string | null
      rejection_reason?: string | null
    }

    const data = await hrApi<unknown>(`/onboarding-documents/${id}/`, {
      method: 'PATCH',
      body: { status, verified_by, rejection_reason },
    })
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Document PUT route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await hrApi<unknown>(`/onboarding-documents/${id}/`, { method: 'DELETE' })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Document DELETE route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
