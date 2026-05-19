export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const pageSize = parseInt(searchParams.get('pageSize') ?? '20')
  const search = searchParams.get('search') ?? ''

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .eq('is_deleted', false)
    .order('name')
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count, page, pageSize })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(true)
  const body = await req.json()

  const { data, error } = await supabase
    .from('companies')
    .insert({ ...body, tenant_id: body.tenant_id ?? crypto.randomUUID() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
