export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'

interface DRFList<T> { count: number; results: T[] }

interface TrainingEnrollment {
  id: string
  attendance_status: string
  score: number | null
  certificate_url: string | null
  training_session: {
    id: string
    title: string
    trainer_name: string
    start_date: string
    end_date: string
    is_mandatory: boolean
    department: string | null
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId required' }, { status: 400 })
    }

    const res = await hrApi<DRFList<TrainingEnrollment>>('/training-enrollments/', {
      params: { employee_id: employeeId },
    })

    // Flatten: spread nested training_session fields alongside enrollment fields
    const flat = (res.results ?? []).map((row) => ({
      ...(row.training_session ?? {}),
      attendance_status: row.attendance_status,
      score: row.score,
      certificate_url: row.certificate_url,
    }))

    return NextResponse.json({ data: flat })
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
