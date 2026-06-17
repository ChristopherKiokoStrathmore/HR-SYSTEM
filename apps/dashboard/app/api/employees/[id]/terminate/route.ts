export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'
import { terminationSchema } from '@hr/shared'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const parsed = terminationSchema.safeParse({ ...body, employee_id: params.id })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { reason, last_working_date, details, exit_interview_notes } = parsed.data

    const data = await hrApi(`/all-employees/${params.id}/terminate/`, {
      method: 'POST',
      body: { reason, last_working_date, details, exit_interview_notes },
    })

    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to terminate employee' }, { status: 500 })
  }
}
