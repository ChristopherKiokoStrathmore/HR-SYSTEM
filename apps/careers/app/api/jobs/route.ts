export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET() {
  const supabase = createServerClient(true)

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, nice_to_have_keywords, employment_type, closing_date, created_at')
    .eq('is_deleted', false)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
