export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient, createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext } from '@/lib/employee-context'

export async function GET(req: NextRequest) {
  const supa = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { employee: emp } = await resolveEmployeeContext(service, user)
  if (!emp) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const year = new URL(req.url).searchParams.get('year') ?? new Date().getFullYear().toString()

  const { data, error } = await (service.from('leave_balances') as any)
    .select('*')
    .eq('employee_id', emp.id)
    .eq('year', parseInt(year))
    .eq('is_deleted', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
