export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import type { CandidateStage } from '@hr/shared'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const { stage, notes } = (await req.json()) as { stage: CandidateStage; notes?: string }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('candidates') as any)
    .update({
      current_stage: stage,
      ...(notes !== undefined ? { notes } : {}),
      ...(stage === 'rejected' ? { rejection_reason: notes ?? 'Manually rejected' } : {}),
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
