export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import type { CandidateStage } from '@hr/shared'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const supabase = createServerClient(true)
  const { stage, notes, forceHire } = (await req.json()) as {
    stage: CandidateStage
    notes?: string
    forceHire?: boolean  // Allow bypassing background check warning (not block)
  }

  // If transitioning to 'hired', check background check requirements
  if (stage === 'hired') {
    // Call the database function to check if hiring is allowed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: canHireResult, error: checkError } = await (supabase.rpc as any)('can_hire_candidate', {
      p_candidate_id: id,
    })

    if (checkError) {
      console.error('Background check gate error:', checkError)
      // Don't block on error, just log it
    } else if (canHireResult) {
      const result = canHireResult as {
        can_hire: boolean
        warning?: boolean
        reason: string
        pending_checks?: number
      }

      // Hard block: company requires background check and blocks hiring
      if (!result.can_hire) {
        return NextResponse.json({
          error: 'Cannot hire candidate',
          reason: result.reason,
          pending_checks: result.pending_checks,
          blocked: true,
          message: 'Background check required before hiring. Please complete background checks first.',
        }, { status: 403 })
      }

      // Soft warning: background check incomplete but not blocking
      if (result.warning && !forceHire) {
        return NextResponse.json({
          error: 'Background check incomplete',
          reason: result.reason,
          pending_checks: result.pending_checks,
          warning: true,
          message: 'Background check is incomplete. Set forceHire=true to proceed anyway.',
        }, { status: 400 })
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('candidates') as any)
    .update({
      current_stage: stage,
      ...(notes !== undefined ? { notes } : {}),
      ...(stage === 'rejected' ? { rejection_reason: notes ?? 'Manually rejected' } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
