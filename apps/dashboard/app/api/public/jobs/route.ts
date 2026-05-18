import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  const supabase = createServerClient(true)
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  let query = supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, nice_to_have_keywords, employment_type, closing_date, created_at, company_id')
    .eq('is_deleted', false)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
