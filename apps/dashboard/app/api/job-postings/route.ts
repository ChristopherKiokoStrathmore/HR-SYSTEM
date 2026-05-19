export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { getSessionUserId } from '@/lib/get-session-user'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const status = searchParams.get('status')
  const search = searchParams.get('search') ?? ''

  let query = supabase
    .from('job_postings')
    .select('*, _count:candidates(count)', { count: 'exact' })
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)
  if (status) query = query.eq('status', status)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, count })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(true)
  const body = await req.json()
  const userId = await getSessionUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('job_postings') as any)
    .insert({
      ...body,
      created_by: userId,
      tenant_id: body.company_id,
      required_keywords: body.required_keywords ?? [],
      nice_to_have_keywords: body.nice_to_have_keywords ?? [],
      auto_reject_threshold: body.auto_reject_threshold ?? 60,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
