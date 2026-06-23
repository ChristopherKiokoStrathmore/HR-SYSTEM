export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

const HR_API_URL     = (process.env.HR_API_URL     ?? '').replace(/\/$/, '')
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY  ?? ''

function toNairobiDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

function todayStartNairobi(): Date {
  const today = toNairobiDate(new Date())
  // Africa/Nairobi is UTC+3
  return new Date(today + 'T00:00:00+03:00')
}

// Both naming conventions exist: older direct-writes used clock_in/clock_out;
// Django uses check_in/check_out. Accept both so history shows correctly.
const CHECK_IN_TYPES  = ['clock_in',  'check_in']
const CHECK_OUT_TYPES = ['clock_out', 'check_out']

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  const today = toNairobiDate(new Date())
  if (!sql) return NextResponse.json({ data: [], today })

  try {
    const emp = await sql`
      SELECT id FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const empId = emp[0].id
    const since = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()

    const events = await sql`
      SELECT id, time, event_type, lat, lng
      FROM attendance_events
      WHERE employee_id = ${empId}
        AND time >= ${since}
        AND event_type = ANY(${sql.array([...CHECK_IN_TYPES, ...CHECK_OUT_TYPES])})
      ORDER BY time ASC
    `

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byDate = new Map<string, any[]>()
    for (const ev of events) {
      const dateStr = toNairobiDate(new Date(ev.time as string))
      if (!byDate.has(dateStr)) byDate.set(dateStr, [])
      byDate.get(dateStr)!.push(ev)
    }

    const records = Array.from(byDate.entries())
      .map(([date, evs]) => {
        const clockIn  = evs.find((e) => CHECK_IN_TYPES.includes(e.event_type  as string))
        const clockOut = evs.find((e) => CHECK_OUT_TYPES.includes(e.event_type as string))
        return {
          id:              (clockIn?.id ?? clockOut?.id ?? date) as string,
          shift_date:      date,
          check_in_time:   clockIn  ? (clockIn.time  as string) : null,
          check_out_time:  clockOut ? (clockOut.time as string) : null,
          check_in_lat:    clockIn?.lat  ?? null,
          check_in_lng:    clockIn?.lng  ?? null,
          status:          clockIn ? 'present' : 'absent',
          is_late:         false,
          distance_covered_km: null,
        }
      })
      .sort((a, b) => b.shift_date.localeCompare(a.shift_date))

    return NextResponse.json({ data: records, today })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  try {
    const emp = await sql`
      SELECT id, company_id, worker_class FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    if (emp[0].worker_class !== 'blue_collar') {
      return NextResponse.json(
        { error: 'Check-in is only available to blue-collar workers' },
        { status: 403 },
      )
    }

    const empId     = emp[0].id
    const companyId = emp[0].company_id
    const body      = await req.json()
    const start     = todayStartNairobi().toISOString()
    const now       = new Date().toISOString()
    const deviceId  = (req.headers.get('user-agent') ?? 'pwa-web').slice(0, 200)

    const todayEvents = await sql`
      SELECT id, time, event_type, lat, lng
      FROM attendance_events
      WHERE employee_id = ${empId}
        AND time >= ${start}
        AND event_type = ANY(${sql.array([...CHECK_IN_TYPES, ...CHECK_OUT_TYPES])})
      ORDER BY time ASC
    `

    const clockIn  = todayEvents.find((e) => CHECK_IN_TYPES.includes(e.event_type  as string))
    const clockOut = todayEvents.find((e) => CHECK_OUT_TYPES.includes(e.event_type as string))

    if (clockIn && clockOut) {
      return NextResponse.json(
        { error: 'Attendance already completed for today', action: 'already_done' },
        { status: 409 },
      )
    }

    // capture_location does not involve face verification — handle directly.
    if (body.action === 'capture_location') {
      if (!clockIn) {
        return NextResponse.json({ error: 'No check-in exists for today' }, { status: 409 })
      }
      if (body.lat == null || body.lng == null) {
        return NextResponse.json({ error: 'GPS coordinates required' }, { status: 400 })
      }
      await sql`
        UPDATE attendance_events SET lat = ${body.lat}, lng = ${body.lng}
        WHERE id = ${clockIn.id}
      `
      return NextResponse.json({ action: 'captured_location', workHours: null })
    }

    // Proxy check-in / check-out to Django.
    // Django owns SmileID face verification, geofence evaluation, and DB write.
    const eventType = clockIn ? 'check_out' : 'check_in'

    const djangoRes = await fetch(`${HR_API_URL}/attendance/check-in/`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'X-Service-Key': HR_SERVICE_KEY,
        'X-User-Id':     session.user_id,
        'X-Company-Id':  String(companyId),
      },
      body: JSON.stringify({
        employee_id:   empId,
        company_id:    companyId,
        event_type:    eventType,
        selfie_b64:    body.selfie_b64 ?? '',
        lat:           body.lat   ?? null,
        lng:           body.lng   ?? null,
        device_id:     deviceId,
        face_verified: body.face_verified ?? null,
      }),
      signal: AbortSignal.timeout(90_000),
    })

    if (djangoRes.status === 403) {
      const err = await djangoRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: (err as { error?: string }).error ?? 'Face not recognised. Please try again in good lighting.' },
        { status: 403 },
      )
    }

    if (!djangoRes.ok) {
      return NextResponse.json(
        { error: 'Could not reach face-recognition service. Try again shortly.' },
        { status: 502 },
      )
    }

    const djangoData = await djangoRes.json() as {
      ok: boolean
      event_type: string
      face_verified: boolean | null
      violation_id?: string | null
      reason_required?: boolean
    }

    if (eventType === 'check_out') {
      const workHours = clockIn
        ? (new Date(now).getTime() - new Date(clockIn.time as string).getTime()) / (1000 * 60 * 60)
        : null
      return NextResponse.json({ action: 'checked_out', workHours, faceVerified: djangoData.face_verified })
    }

    return NextResponse.json({
      action: 'checked_in',
      workHours: null,
      faceVerified: djangoData.face_verified,
      violation_id: djangoData.violation_id ?? null,
      reason_required: djangoData.reason_required ?? false,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
