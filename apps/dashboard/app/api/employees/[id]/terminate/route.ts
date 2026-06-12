export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { terminationSchema } from '@hr/shared'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const body = await req.json()

  const parsed = terminationSchema.safeParse({ ...body, employee_id: params.id })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { reason, details, last_working_date, exit_interview_notes } = parsed.data

  // Map termination reason to employment_status
  const statusMap: Record<string, string> = {
    resigned: 'resigned',
    terminated: 'terminated',
    contract_end: 'terminated',
    redundancy: 'terminated',
    misconduct: 'terminated',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('employee_profiles') as any)
    .update({
      employment_status: statusMap[reason] as 'terminated' | 'resigned',
      end_date: last_working_date,
    })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Write audit log via RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).rpc('write_audit_log', {
    p_action: 'EMPLOYEE_TERMINATED',
    p_entity_type: 'employee_profiles',
    p_entity_id: params.id,
    p_new_values: { reason, details, last_working_date, exit_interview_notes },
  })

  return NextResponse.json({ data })
}
