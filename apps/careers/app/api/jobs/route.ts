export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db.server'

export async function GET() {
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT id, title, department, description, required_keywords, nice_to_have_keywords,
             employment_type, closing_date, created_at
      FROM job_postings
      WHERE is_deleted = false AND status = 'open'
      ORDER BY created_at DESC
    `
    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('[api/jobs]', err)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}
