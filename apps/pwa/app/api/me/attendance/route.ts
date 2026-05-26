export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient, createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext } from '@/lib/employee-context'

function toDateString(d: Date) {
  // Use Africa/Nairobi (EAT = UTC+3) so shift_date reflects the employee's local business day,
  // not the UTC calendar date — matters for check-ins between 21:00-00:00 EAT.
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })
}

export async function GET(req: NextRequest) {
  const supa = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supa.auth.getUser()

  const { employee: emp } = await resolveEmployeeContext(service, user)
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const today = toDateString(new Date())
  const sevenDaysAgo = toDateString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))

  const { data, error } = await (service.from('attendance') as any)
    .select('*')
    .eq('employee_id', emp.id)
    .gte('shift_date', sevenDaysAgo)
    .lte('shift_date', today)
    .order('shift_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], today })
}

export async function POST(req: NextRequest) {
  const supa = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supa.auth.getUser()

  const { employee: emp } = await resolveEmployeeContext(service, user)
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const body = await req.json()
  const today = toDateString(new Date())
  const now = new Date().toISOString()

  const { data: existing } = await (service.from('attendance') as any)
    .select('id, check_in_time, check_out_time')
    .eq('employee_id', emp.id)
    .eq('shift_date', today)
    .single()

  // Already fully complete — don't allow another action today
  if (existing?.check_in_time && existing?.check_out_time) {
    return NextResponse.json(
      { error: 'Attendance already completed for today', action: 'already_done' },
      { status: 409 }
    )
  }

  const isCheckIn = !existing?.check_in_time
  const workHours = !isCheckIn && existing?.check_in_time
    ? (new Date(now).getTime() - new Date(existing.check_in_time).getTime()) / (1000 * 60 * 60)
    : null

  const record: Record<string, unknown> = {
    employee_id: emp.id,
    company_id: emp.company_id,
    tenant_id: emp.tenant_id,
    shift_date: today,
    status: 'present',
    is_late: false,
    is_early_departure: false,
  }

  if (isCheckIn) {
    record.check_in_time = now
    record.check_in_lat = body.lat ?? null
    record.check_in_lng = body.lng ?? null
    record.gps_path = body.lat ? [{ lat: body.lat, lng: body.lng, timestamp: now }] : null
  } else {
    record.check_out_time = now
    record.check_out_lat = body.lat ?? null
    record.check_out_lng = body.lng ?? null
    record.distance_covered_km = body.distanceKm ?? null
  }

  const { data, error } = await (service.from('attendance') as any)
    .upsert(record, { onConflict: 'employee_id,shift_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, action: isCheckIn ? 'checked_in' : 'checked_out', workHours })
}
