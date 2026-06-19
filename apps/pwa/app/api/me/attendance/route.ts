export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

function toNairobiDate(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

function todayStartNairobi(): Date {
  const today = toNairobiDate(new Date())
  // Africa/Nairobi is UTC+3
  return new Date(today + 'T00:00:00+03:00')
}

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
      ORDER BY time ASC
    `

    // Group events by Nairobi calendar date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byDate = new Map<string, any[]>()
    for (const ev of events) {
      const dateStr = toNairobiDate(new Date(ev.time as string))
      if (!byDate.has(dateStr)) byDate.set(dateStr, [])
      byDate.get(dateStr)!.push(ev)
    }

    const records = Array.from(byDate.entries())
      .map(([date, evs]) => {
        const clockIn = evs.find((e) => e.event_type === 'clock_in')
        const clockOut = evs.find((e) => e.event_type === 'clock_out')
        return {
          id: (clockIn?.id ?? clockOut?.id ?? date) as string,
          shift_date: date,
          check_in_time: clockIn ? (clockIn.time as string) : null,
          check_out_time: clockOut ? (clockOut.time as string) : null,
          check_in_lat: clockIn?.lat ?? null,
          check_in_lng: clockIn?.lng ?? null,
          status: clockIn ? 'present' : 'absent',
          is_late: false,
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
      SELECT id, company_id FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const empId = emp[0].id
    const companyId = emp[0].company_id
    const body = await req.json()
    const start = todayStartNairobi().toISOString()
    const now = new Date().toISOString()
    const deviceId = (req.headers.get('user-agent') ?? 'pwa-web').slice(0, 200)

    const todayEvents = await sql`
      SELECT id, time, event_type, lat, lng
      FROM attendance_events
      WHERE employee_id = ${empId}
        AND time >= ${start}
      ORDER BY time ASC
    `

    const clockIn = todayEvents.find((e) => e.event_type === 'clock_in')
    const clockOut = todayEvents.find((e) => e.event_type === 'clock_out')

    if (clockIn && clockOut) {
      return NextResponse.json(
        { error: 'Attendance already completed for today', action: 'already_done' },
        { status: 409 }
      )
    }

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

    if (!clockIn) {
      await sql`
        INSERT INTO attendance_events (employee_id, company_id, event_type, time, lat, lng, device_id, out_of_zone_reason, source_app)
        VALUES (${empId}, ${companyId}, 'clock_in', ${now}, ${body.lat ?? null}, ${body.lng ?? null}, ${deviceId}, '', 'pwa')
      `
      return NextResponse.json({ action: 'checked_in', workHours: null })
    }

    // Check out
    const workHours =
      (new Date(now).getTime() - new Date(clockIn.time as string).getTime()) / (1000 * 60 * 60)
    await sql`
      INSERT INTO attendance_events (employee_id, company_id, event_type, time, lat, lng, device_id, out_of_zone_reason, source_app)
      VALUES (${empId}, ${companyId}, 'clock_out', ${now}, ${body.lat ?? null}, ${body.lng ?? null}, ${deviceId}, '', 'pwa')
    `
    return NextResponse.json({ action: 'checked_out', workHours })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
