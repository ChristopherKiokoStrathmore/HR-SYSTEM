export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

// Enrol one or more employees into a training session
export async function POST(req: NextRequest) {
  try {
    const { sessionId, employeeIds } = (await req.json()) as {
      sessionId: string
      employeeIds: string[]
    }

    if (!sessionId || !employeeIds?.length) {
      return NextResponse.json({ error: 'sessionId and employeeIds required' }, { status: 400 })
    }

    const data = await hrApi(`/training-sessions/${sessionId}/enrol/`, {
      method: 'POST',
      body: { employee_ids: employeeIds },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
