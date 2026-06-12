export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, updateBackgroundCheckSchema, reviewBackgroundCheckSchema } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'
import { getSessionUserId } from '@/lib/get-session-user'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/background-checks/[id]
 * Get a single background check by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createServerClient(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('background_checks') as any)
      .select(`
        *,
        employee:employee_profiles(
          employee_number,
          user:users!employee_profiles_user_id_fkey(full_name, email)
        ),
        candidate:candidates(full_name, email),
        requested_by_user:users!background_checks_requested_by_fkey(full_name),
        reviewed_by_user:users!background_checks_reviewed_by_fkey(full_name)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) {
      console.error('Background check GET error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Background check not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Background check GET route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/background-checks/[id]
 * Update a background check (status, review, etc.)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const { id } = await params
    const supabase = createServerClient(true)
    const body = await req.json()

    // Get the session user for reviewed_by
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if this is a review action (final status)
    const isReview = ['passed', 'failed', 'flagged'].includes(body.status)

    // Validate input
    const schema = isReview ? reviewBackgroundCheckSchema : updateBackgroundCheckSchema
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { data: validData } = parsed

    // Build update object
    const updateData: Record<string, unknown> = {
      status: validData.status,
      notes: validData.notes ?? null,
    }

    // Add review-specific fields
    if (isReview) {
      updateData.reviewed_by = userId
      updateData.completed_at = new Date().toISOString()
      updateData.result_summary = validData.result_summary
      updateData.clearance_date = validData.clearance_date
      updateData.expiry_date = validData.expiry_date ?? null
      updateData.flags = validData.flags ?? []
    } else {
      // Regular update
      if (validData.result_summary !== undefined) updateData.result_summary = validData.result_summary
      if (validData.clearance_date !== undefined) updateData.clearance_date = validData.clearance_date
      if (validData.expiry_date !== undefined) updateData.expiry_date = validData.expiry_date
      if (validData.flags !== undefined) updateData.flags = validData.flags
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('background_checks') as any)
      .update(updateData)
      .eq('id', id)
      .eq('is_deleted', false)
      .select(`
        *,
        employee:employee_profiles(
          employee_number,
          user:users!employee_profiles_user_id_fkey(full_name, email)
        ),
        candidate:candidates(full_name, email),
        requested_by_user:users!background_checks_requested_by_fkey(full_name),
        reviewed_by_user:users!background_checks_reviewed_by_fkey(full_name)
      `)
      .single()

    if (error) {
      console.error('Background check PUT error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Background check not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Background check PUT route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/background-checks/[id]
 * Soft delete a background check
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  try {
    const { id } = await params
    const supabase = createServerClient(true)

    // Get the session user
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('background_checks') as any)
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      console.error('Background check DELETE error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Background check DELETE route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
