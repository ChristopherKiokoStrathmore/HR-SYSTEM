export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db.server'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT id, title, department, description, required_keywords, nice_to_have_keywords,
             employment_type, closing_date, created_at
      FROM job_postings
      WHERE id = ${params.id} AND is_deleted = false AND status = 'open'
    `
    if (!rows.length) return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
    return NextResponse.json({ data: rows[0] })
  } catch (err) {
    console.error('[api/jobs/[id]]', err)
    return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
  }
}
