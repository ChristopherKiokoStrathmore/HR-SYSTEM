export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const { stage, notes } = await req.json()

    const data = await hrApi<unknown>(`/candidates/${id}/stage/`, {
      method: 'PUT',
      body: { stage, notes },
    })

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Candidate stage PUT route error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
