export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoPost } from '@/lib/django-client'

export async function POST(req: NextRequest) {
  const { sessionId, employeeIds } = await req.json() as { sessionId: string; employeeIds: string[] }
  if (!sessionId || !employeeIds?.length) {
    return NextResponse.json({ error: 'sessionId and employeeIds are required' }, { status: 400 })
  }
  const { data, error } = await djangoPost(`/training-sessions/${sessionId}/enrol/`, { employee_ids: employeeIds })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
