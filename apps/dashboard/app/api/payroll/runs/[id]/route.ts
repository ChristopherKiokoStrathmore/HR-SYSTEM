export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { calculatePayroll } from '@hr/shared'

interface EmployeeRow {
  id: string
  salary: number
  payment_method: string
  tenant_id: string
}

interface RunRow {
  id: string
  company_id: string
  period_month: number
  period_year: number
  status: string
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*, records:payroll_records(*)')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

// POST — compute payroll records for all active employees in this run's company
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)

  const { data: run } = await supabase
    .from('payroll_runs')
    .select('id, company_id, period_month, period_year, status')
    .eq('id', params.id)
    .single() as { data: RunRow | null; error: unknown }

  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: employees } = await (supabase.from('employee_profiles') as any)
    .select('id, salary, payment_method, tenant_id')
    .eq('company_id', run.company_id)
    .eq('employment_status', 'active')
    .eq('is_deleted', false) as { data: EmployeeRow[] | null }

  if (!employees?.length) {
    return NextResponse.json({ error: 'No active employees found' }, { status: 400 })
  }

  let totalGross = 0, totalDeductions = 0, totalNet = 0

  const records = employees.map((emp) => {
    const calc = calculatePayroll({ gross_salary: emp.salary })
    totalGross += calc.gross_salary
    totalDeductions += calc.paye + calc.nssf + calc.nhif + calc.helb + calc.other_deductions
    totalNet += calc.net_salary
    return {
      payroll_run_id: params.id,
      employee_id: emp.id,
      gross_salary: calc.gross_salary,
      paye: calc.paye,
      nssf: calc.nssf,
      nhif: calc.nhif,
      helb: calc.helb,
      other_deductions: calc.other_deductions,
      net_salary: calc.net_salary,
      payment_method: emp.payment_method,
      payment_status: 'pending',
      tenant_id: emp.tenant_id,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: recErr } = await (supabase.from('payroll_records') as any)
    .upsert(records, { onConflict: 'payroll_run_id,employee_id' })
  if (recErr) return NextResponse.json({ error: recErr.message }, { status: 500 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error: updateErr } = await (supabase.from('payroll_runs') as any)
    .update({ status: 'processing', total_gross: totalGross, total_deductions: totalDeductions, total_net: totalNet })
    .eq('id', params.id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  return NextResponse.json({ data: updated, recordCount: records.length })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const body = await req.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('payroll_runs') as any)
    .update(body)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
