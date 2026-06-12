export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const jobPostingId = searchParams.get('jobPostingId')
  const stage = searchParams.get('stage')
  const search = searchParams.get('search') ?? ''

  let query = supabase
    .from('candidates')
    .select('*, job_posting:job_postings(title, department, company_id)')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (jobPostingId) query = query.eq('job_posting_id', jobPostingId)
  if (stage) query = query.eq('current_stage', stage)
  if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient(true)
  const body = await req.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('candidates') as any)
    .insert({
      ai_extracted_skills: [],
      ...body,
      tenant_id: body.tenant_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
