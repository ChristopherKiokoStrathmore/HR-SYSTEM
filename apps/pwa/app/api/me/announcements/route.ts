export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createCookieClient } from '@/lib/supabase-server'

export async function GET() {
  const supa = await createCookieClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: emp } = await (supa.from('employee_profiles') as any)
    .select('company_id, department').eq('user_id', user.id).eq('is_deleted', false).single()
  if (!emp) return NextResponse.json({ data: [] })

  const today = new Date().toISOString()

  const { data, error } = await (supa.from('announcements') as any)
    .select('*')
    .eq('company_id', emp.company_id)
    .eq('is_deleted', false)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .or(`department.is.null,department.eq.${emp.department}`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
