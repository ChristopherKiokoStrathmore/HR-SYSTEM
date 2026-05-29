export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export interface LocationRow {
  id: string
  employee_id: string
  company_id: string
  check_in_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  is_late: boolean
  status: string
  employee_name: string | null
  job_title: string | null
  department: string | null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const date = searchParams.get('date') ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })

    if (!companyId) {
      return NextResponse.json({ data: [] })
    }

    // Resolve tenant_id for the selected company so we can show
    // GPS check-ins from ALL companies in the same tenant on the map.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: company } = await (supabase.from('companies') as any)
      .select('tenant_id')
      .eq('id', companyId)
      .single() as { data: { tenant_id: string } | null }

    const tenantId = company?.tenant_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('attendance') as any)
      .select(`
        id, employee_id, company_id, is_late, status,
        check_in_time, check_in_lat, check_in_lng,
        employee:employee_profiles(
          job_title, department,
          user:users!user_id(full_name)
        )
      `)
      .eq('shift_date', date)
      .not('check_in_lat', 'is', null)
      .not('check_in_lng', 'is', null)

    // Prefer tenant-wide so employees from sister companies show on the map.
    // Fall back to company-only if tenant_id is unavailable.
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    } else {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query as {
      data: Array<{
        id: string
        employee_id: string
        company_id: string
        is_late: boolean
        status: string
        check_in_time: string | null
        check_in_lat: number | null
        check_in_lng: number | null
        employee: {
          job_title: string | null
          department: string | null
          user: { full_name: string | null } | null
        } | null
      }> | null
      error: unknown
    }

    if (error) {
      console.error('Attendance locations API error:', error)
      return NextResponse.json({ data: [], error: String(error) })
    }

    const rows: LocationRow[] = (data ?? []).map(r => ({
      id: r.id,
      employee_id: r.employee_id,
      company_id: r.company_id,
      check_in_time: r.check_in_time,
      check_in_lat: r.check_in_lat,
      check_in_lng: r.check_in_lng,
      is_late: r.is_late,
      status: r.status,
      employee_name: r.employee?.user?.full_name ?? null,
      job_title: r.employee?.job_title ?? null,
      department: r.employee?.department ?? null,
    }))

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('Attendance locations GET error:', err)
    return NextResponse.json({ data: [], error: 'Internal server error' })
  }
}
