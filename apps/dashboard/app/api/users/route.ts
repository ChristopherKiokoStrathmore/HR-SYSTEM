export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('users') as any)
      .select('id, full_name, email, role, avatar_url, phone, is_active, preferred_language, last_login_at, created_at, company_id')
      .eq('is_deleted', false)
      .order('full_name')

    if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query
    if (error) {
      console.error('Users API error:', error)
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 })
    }
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Users GET route error:', err)
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}
