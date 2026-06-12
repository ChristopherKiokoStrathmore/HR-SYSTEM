export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const entityId = searchParams.get('entityId')
    const action = searchParams.get('action')
    const companyId = searchParams.get('companyId')
    const limit = parseInt(searchParams.get('limit') ?? '100', 10)

    let query = supabase
      .from('audit_logs')
      .select('*, performed_by_user:users!user_id(full_name)')
      .order('timestamp', { ascending: false })
      .limit(Math.min(limit, 500))

    if (entityId) query = query.eq('entity_id', entityId)
    if (action) query = query.eq('action', action)
    if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query

    if (error) {
      console.error('Audit log API error:', error)
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 })
    }
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Audit log GET route error:', err)
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}
