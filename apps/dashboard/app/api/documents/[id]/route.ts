export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const body = await req.json()
  const { action, rejection_reason } = body as {
    action: 'verify' | 'reject'
    rejection_reason?: string
  }

  // Get current user for verified_by
  const { data: { session } } = await supabase.auth.getSession()

  const update =
    action === 'verify'
      ? { status: 'verified' as const, verified_by: session?.user.id ?? null, rejection_reason: null }
      : { status: 'rejected' as const, rejection_reason: rejection_reason ?? 'Rejected by HR' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('documents') as any)
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('documents') as any)
    .update({ is_deleted: true })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
