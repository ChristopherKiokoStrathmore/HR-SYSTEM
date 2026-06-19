export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ data: [] })

  try {
    const emp = await sql`
      SELECT id FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const rows = await sql`
      SELECT pr.*, run.period_month, run.period_year, run.status AS run_status
      FROM payroll_records pr
      LEFT JOIN payroll_runs run ON run.id = pr.payroll_run_id
      WHERE pr.employee_id = ${emp[0].id}
        AND pr.is_deleted = false
      ORDER BY pr.created_at DESC
      LIMIT 24
    `

    return NextResponse.json({ data: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
