export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createCookieClient, createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext } from '@/lib/employee-context'

export async function GET() {
  const supa = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supa.auth.getUser()

  const { employee: emp } = await resolveEmployeeContext(service, user)
  if (!emp) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

  const { data, error } = await (service.from('payroll_records') as any)
    .select('*, payroll_run:payroll_runs(period_month, period_year, status)')
    .eq('employee_id', emp.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(24)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
