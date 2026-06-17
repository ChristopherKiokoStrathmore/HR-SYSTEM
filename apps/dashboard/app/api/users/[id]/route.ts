export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const allowed = ['role', 'is_active', 'preferred_language', 'phone']
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    const data = await hrApi(`/users/${params.id}/`, { method: 'PATCH', body: patch })
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
