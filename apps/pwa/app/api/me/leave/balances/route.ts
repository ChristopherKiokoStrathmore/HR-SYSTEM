export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

export async function GET(req: NextRequest) {
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
    if (!emp[0]) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

    const year = parseInt(new URL(req.url).searchParams.get('year') ?? String(new Date().getFullYear()))

    const rows = await sql`
      SELECT * FROM leave_balances
      WHERE employee_id = ${emp[0].id}
        AND year = ${year}
        AND is_deleted = false
    `

    return NextResponse.json({ data: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
