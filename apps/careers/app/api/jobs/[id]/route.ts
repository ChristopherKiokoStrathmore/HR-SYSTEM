export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, nice_to_have_keywords, employment_type, closing_date, created_at')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .eq('status', 'open')
    .single()

  if (error) return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
  return NextResponse.json({ data })
}
