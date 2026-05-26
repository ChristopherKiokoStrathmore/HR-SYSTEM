export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createBackgroundCheckSchema } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSessionUserId } from '@/lib/get-session-user'

/**
 * GET /api/background-checks
 * List background checks with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)

    const companyId = searchParams.get('companyId')
    const status = searchParams.get('status')
    const checkType = searchParams.get('checkType')
    const employeeId = searchParams.get('employeeId')
    const candidateId = searchParams.get('candidateId')
    const expiringWithinDays = searchParams.get('expiringWithinDays')
    const page = parseInt(searchParams.get('page') ?? '1')
    const pageSize = parseInt(searchParams.get('pageSize') ?? '25')

    // Build query with joins for subject info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('background_checks') as any)
      .select(`
        *,
        employee:employee_profiles(
          employee_number,
          user:users!employee_profiles_user_id_fkey(full_name, email)
        ),
        candidate:candidates(full_name, email),
        requested_by_user:users!background_checks_requested_by_fkey(full_name),
        reviewed_by_user:users!background_checks_reviewed_by_fkey(full_name)
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('requested_at', { ascending: false })

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (checkType) {
      query = query.eq('check_type', checkType)
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }
    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }
    if (expiringWithinDays) {
      const days = parseInt(expiringWithinDays)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + days)
      query = query
        .not('expiry_date', 'is', null)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gte('expiry_date', new Date().toISOString().split('T')[0])
    }

    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Background checks GET error:', error)
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 })
    }

    return NextResponse.json({
      data,
      count,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    })
  } catch (err) {
    console.error('Background checks GET route error:', err)
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}

/**
 * POST /api/background-checks
 * Create a new background check request
 */
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const supabase = createServerClient(true)
    const body = await req.json()

    // Get the session user for requested_by
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate input
    const parsed = createBackgroundCheckSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: validData } = parsed

    // Insert the background check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('background_checks') as any)
      .insert({
        employee_id: validData.employee_id ?? null,
        candidate_id: validData.candidate_id ?? null,
        company_id: validData.company_id,
        check_type: validData.check_type,
        status: validData.document_url ? 'completed' : 'pending',
        requested_by: userId,
        requested_at: new Date().toISOString(),
        document_url: validData.document_url ?? null,
        document_uploaded_at: validData.document_url ? new Date().toISOString() : null,
        clearance_date: validData.clearance_date ?? null,
        expiry_date: validData.expiry_date ?? null,
        notes: validData.notes ?? null,
        provider_name: 'manual',
        tenant_id: validData.company_id,
      })
      .select(`
        *,
        employee:employee_profiles(
          employee_number,
          user:users!employee_profiles_user_id_fkey(full_name, email)
        ),
        candidate:candidates(full_name, email)
      `)
      .single()

    if (error) {
      console.error('Background checks POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Background checks POST route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
