import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'

// Demo-mode disbursement — marks all pending records as paid with a generated reference.
// Wire real Daraja / banking API credentials before going to production.
export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'moderate')
  if (limited) return limited

  const supabase = createServerClient(true)
  const { runId, method } = (await req.json()) as { runId: string; method: 'mpesa' | 'bank' | 'airtel' }

  if (!runId) return NextResponse.json({ error: 'runId required' }, { status: 400 })

  const ref = `SL-${Date.now()}-${method.toUpperCase()}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: recErr } = await (supabase.from('payroll_records') as any)
    .update({
      payment_status: 'paid',
      payment_reference: ref,
      paid_at: new Date().toISOString(),
    })
    .eq('payroll_run_id', runId)
    .eq('payment_status', 'pending')

  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('payroll_runs') as any)
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', runId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    reference: ref,
    demo: true,
  }, {
    headers: { 'X-Demo-Mode': 'true' },
  })
}
