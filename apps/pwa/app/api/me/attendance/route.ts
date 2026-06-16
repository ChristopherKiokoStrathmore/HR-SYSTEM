export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet, djangoPost } from '@/lib/django-client'

// NOTE: the PWA's old "attendance" table (manual punch in/out, one row per
// shift_date) doesn't exist on Railway. The Django backend now has a
// different, event-log based system (selfie+geofence check-in via
// apps.attendance) — see plan Phase 2 for the product-decision flag this
// raised. This route adapts that event log into the shape the existing PWA
// UI/hooks (use-attendance-pwa.ts) already expect, so no frontend
// components needed to change.

interface AttendanceEvent {
  id: number
  time: string
  event_type: 'check_in' | 'check_out' | 'location_ping' | 'geofence_exit' | 'geofence_enter'
  lat: number | null
  lng: number | null
}

interface AttendanceRecord {
  id: string
  shift_date: string
  check_in_time: string | null
  check_out_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  status: string
  is_late: boolean
  distance_covered_km: number | null
}

function toDateString(d: Date) {
  // Africa/Nairobi (EAT = UTC+3) so shift_date reflects the employee's local
  // business day, not the UTC calendar date.
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

function groupByShiftDate(events: AttendanceEvent[]): AttendanceRecord[] {
  const byDate = new Map<string, AttendanceRecord>()
  // Events come back newest-first; walk oldest-first so first check_in/last
  // check_out per day win naturally.
  for (const ev of [...events].reverse()) {
    const shiftDate = toDateString(new Date(ev.time))
    const rec = byDate.get(shiftDate) ?? {
      id: shiftDate,
      shift_date: shiftDate,
      check_in_time: null,
      check_out_time: null,
      check_in_lat: null,
      check_in_lng: null,
      status: 'present',
      is_late: false,
      distance_covered_km: null,
    }
    if (ev.event_type === 'check_in' && !rec.check_in_time) {
      rec.check_in_time = ev.time
      rec.check_in_lat = ev.lat
      rec.check_in_lng = ev.lng
    }
    if (ev.event_type === 'check_out') {
      rec.check_out_time = ev.time
    }
    byDate.set(shiftDate, rec)
  }
  return [...byDate.values()].sort((a, b) => b.shift_date.localeCompare(a.shift_date))
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const today = toDateString(new Date())
  const sevenDaysAgo = toDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

  const { data, error } = await djangoGet<AttendanceEvent[]>(session, '/attendance-events/', {
    employee_id: session.employeeId,
    from: `${sevenDaysAgo}T00:00:00`,
    to: `${today}T23:59:59`,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })

  const events = (data ?? []).filter((e) => e.event_type === 'check_in' || e.event_type === 'check_out')
  return NextResponse.json({ data: groupByShiftDate(events), today })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const body = await req.json()
  const today = toDateString(new Date())
  const action = body.action as 'capture_location' | undefined

  if (action === 'capture_location') {
    if (body.lat == null || body.lng == null) {
      return NextResponse.json({ error: 'GPS coordinates are required to capture location' }, { status: 400 })
    }
    const { data, error } = await djangoPost(session, '/attendance/ping/', {
      employee_id: session.employeeId,
      company_id: session.companyId,
      lat: body.lat,
      lng: body.lng,
    })
    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ data, action: 'captured_location', workHours: null })
  }

  // Figure out whether today's check-in/check-out already happened.
  const { data: todaysEvents, error: lookupError } = await djangoGet<AttendanceEvent[]>(
    session, '/attendance-events/',
    { employee_id: session.employeeId, from: `${today}T00:00:00`, to: `${today}T23:59:59` },
  )
  if (lookupError) return NextResponse.json({ error: lookupError }, { status: 500 })

  const checkedInAt = (todaysEvents ?? []).find((e) => e.event_type === 'check_in')
  const checkedOutAt = (todaysEvents ?? []).find((e) => e.event_type === 'check_out')

  if (checkedInAt && checkedOutAt) {
    return NextResponse.json(
      { error: 'Attendance already completed for today', action: 'already_done' },
      { status: 409 },
    )
  }

  const isCheckIn = !checkedInAt
  const { data, error } = await djangoPost(session, '/attendance/check-in/', {
    employee_id: session.employeeId,
    company_id: session.companyId,
    event_type: isCheckIn ? 'check_in' : 'check_out',
    lat: body.lat ?? null,
    lng: body.lng ?? null,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })

  const workHours = !isCheckIn && checkedInAt
    ? (Date.now() - new Date(checkedInAt.time).getTime()) / (1000 * 60 * 60)
    : null

  return NextResponse.json({ data, action: isCheckIn ? 'checked_in' : 'checked_out', workHours })
}
