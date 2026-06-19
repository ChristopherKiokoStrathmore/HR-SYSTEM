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
      SELECT department FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `

    const companyId = session.company_id
    const department = emp[0]?.department ?? null
    const now = new Date().toISOString()

    const rows = await sql`
      SELECT * FROM announcements
      WHERE company_id = ${companyId}
        AND is_deleted = false
        AND (expires_at IS NULL OR expires_at >= ${now})
        AND (department IS NULL ${department ? sql`OR department = ${department}` : sql``})
      ORDER BY created_at DESC
      LIMIT 10
    `

    return NextResponse.json({ data: rows })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
