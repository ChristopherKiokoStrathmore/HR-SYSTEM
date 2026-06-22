export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const emp = await sql`
    SELECT id FROM employee_profiles
    WHERE user_id = ${session.user_id} AND is_deleted = false
    LIMIT 1
  `
  if (!emp[0]) return NextResponse.json({ error: 'Not an employee account' }, { status: 403 })

  const rows = await sql`
    UPDATE leaves
    SET status = 'cancelled', updated_at = now()
    WHERE id = ${params.id}
      AND employee_id = ${emp[0].id}
      AND status = 'pending'
    RETURNING id, status
  `

  if (!rows[0]) {
    return NextResponse.json(
      { error: 'Request not found or already processed' },
      { status: 404 }
    )
  }

  return NextResponse.json({ data: rows[0] })
}
