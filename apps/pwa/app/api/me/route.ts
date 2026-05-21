export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createCookieClient, createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext, resolvePwaUserRecord } from '@/lib/employee-context'

export async function GET() {
  const supabase = await createCookieClient()
  const service = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr && !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // resolvePwaUserRecord tries Auth UUID first, then falls back to email lookup.
  // This handles the case where seed user IDs differ from Supabase Auth UUIDs.
  const [profile, { employee }] = await Promise.all([
    resolvePwaUserRecord(service, user ?? null),
    resolveEmployeeContext(service, user ?? null),
  ])

  if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const employeeWithCompany = employee
    ? await (service as any)
        .from('employee_profiles')
        .select('*, company:companies(name, logo_url)')
        .eq('id', employee.id)
        .maybeSingle()
        .then(({ data }: { data: unknown }) => data)
    : null

  return NextResponse.json({ data: { user: profile, employee: employeeWithCompany } })
}
