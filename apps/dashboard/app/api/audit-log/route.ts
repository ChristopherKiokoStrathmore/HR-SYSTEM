import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')

  if (!entityId) return NextResponse.json({ error: 'entityId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, performed_by_user:users!user_id(full_name)')
    .eq('entity_id', entityId)
    .order('timestamp', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
