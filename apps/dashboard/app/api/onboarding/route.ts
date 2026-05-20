export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface OnboardingRow {
  id: string
  employee_number: string
  job_title: string
  department: string | null
  start_date: string
  employment_status: string
  user: { full_name: string; email: string; avatar_url: string | null }
  company: { name: string }
  documents: { type: string; status: string }[]
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const cutoff = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - 4)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('employee_profiles') as any)
      .select(`
        id, employee_number, job_title, department, start_date, employment_status,
        user:users!user_id(full_name, email, avatar_url),
        company:companies(name),
        documents(type, status)
      `)
      .eq('is_deleted', false)
      .gte('start_date', cutoff.toISOString().slice(0, 10))
      .order('start_date', { ascending: false })

    if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query as { data: OnboardingRow[] | null; error: unknown }
    if (error) {
      console.error('Onboarding API error:', error)
      return NextResponse.json({ error: String(error), details: 'Failed to fetch onboarding data' }, { status: 500 })
    }

  const REQUIRED_DOCS = ['id', 'nssf', 'nhif', 'kra', 'bank_details', 'contract']
  const enriched = (data ?? []).map((emp) => {
    const docs = emp.documents ?? []
    const verified = docs.filter(d => REQUIRED_DOCS.includes(d.type) && d.status === 'verified').length
    const uploaded = docs.filter(d => REQUIRED_DOCS.includes(d.type)).length
    return {
      ...emp,
      doc_verified: verified,
      doc_uploaded: uploaded,
      doc_required: REQUIRED_DOCS.length,
      doc_pct: Math.round((verified / REQUIRED_DOCS.length) * 100),
    }
  })

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error('Onboarding GET route error:', err)
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
  }
}
