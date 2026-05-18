import { NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext, resolvePwaUserRecord } from '@/lib/employee-context'

export async function GET() {
  const supabase = await createCookieClient()
  const service = createServiceClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  const resolvedUser = user ?? await resolvePwaUserRecord(service, null)
  if (authErr && !resolvedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!resolvedUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use the same cookie client for data queries so auth.uid() is set
  // and RLS policies evaluate correctly. The sb_secret_ key is not a JWT
  // so a service-role client cannot bypass RLS with the new key format.
  const [{ data: profile }, { data: employee }] = await Promise.all([
    service.from('users').select('*').eq('id', resolvedUser.id).single(),
    resolveEmployeeContext(service, resolvedUser),
  ])

  const employeeWithCompany = employee
    ? await service
      .from('employee_profiles')
      .select('*, company:companies(name, logo_url)')
      .eq('id', employee.id)
      .maybeSingle()
      .then(({ data }) => data)
    : null

  return NextResponse.json({ data: { user: profile, employee: employeeWithCompany } })
}
