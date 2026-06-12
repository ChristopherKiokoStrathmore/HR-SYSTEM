export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

interface PaymentHistoryRecord {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string
  department: string | null
  amount: number
  payment_method: 'bank' | 'mpesa' | 'airtel'
  payment_date: string
  reference: string | null
  status: 'paid' | 'failed' | 'pending' | 'processing'
  period_month: number
  period_year: number
}

/**
 * GET /api/payroll/history
 * Get payment history records from Supabase payroll_records
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  try {
    const supabase = createServerClient(true)

    let employeeIds: string[] | null = null
    const employeeMap = new Map<string, { employee_name: string; employee_number: string; department: string | null }>()

    if (companyId) {
      const { data: employees, error: employeeError } = await supabase
        .from('employee_profiles')
        .select('id, employee_number, department, user:users!user_id(full_name)')
        .eq('company_id', companyId)
        .eq('is_deleted', false)

      if (employeeError) {
        console.error('Supabase error fetching employees for history company filter:', employeeError)
        return NextResponse.json({ error: employeeError.message }, { status: 500 })
      }

      const employeeRows = (employees ?? []) as any[]
      employeeIds = employeeRows.map((employee) => employee.id)
      employeeRows.forEach((employee) => {
        employeeMap.set(employee.id, {
          employee_name: employee.user?.full_name ?? '',
          employee_number: employee.employee_number,
          department: employee.department ?? null,
        })
      })

      if (employeeIds.length === 0) {
        return NextResponse.json({ data: [] })
      }
    }

    const recordQuery = supabase
      .from('payroll_records')
      .select(
        `id, employee_id, gross_salary, paye, nssf, nhif, helb, other_deductions, net_salary, payment_method, payment_status, payment_reference, paid_at`
      )
      .order('paid_at', { ascending: false })
      .limit(100)

    if (employeeIds) {
      recordQuery.in('employee_id', employeeIds)
    }

    const { data: records, error: recordError } = await recordQuery
    if (recordError) {
      console.error('Supabase error fetching payroll records:', recordError)
      return NextResponse.json({ error: recordError.message }, { status: 500 })
    }

    const recordList = (records ?? []) as any[]
    if (recordList.length === 0) {
      return NextResponse.json({ data: [] })
    }

    // If no companyId filter, fetch employee info for the records we have
    if (!employeeIds) {
      const ids = Array.from(new Set(recordList.map((record) => record.employee_id)))
      const { data: employees, error: employeeError } = await supabase
        .from('employee_profiles')
        .select('id, employee_number, department, user:users!user_id(full_name)')
        .in('id', ids)
        .eq('is_deleted', false)

      if (employeeError) {
        console.error('Supabase error fetching employees for history:', employeeError)
        return NextResponse.json({ error: employeeError.message }, { status: 500 })
      }

      ;(employees ?? []).forEach((employee: any) => {
        employeeMap.set(employee.id, {
          employee_name: employee.user?.full_name ?? '',
          employee_number: employee.employee_number,
          department: employee.department ?? null,
        })
      })
    }

    const historyRecords: PaymentHistoryRecord[] = recordList.map((rec) => {
      const employee = employeeMap.get(rec.employee_id)
      const paymentDate = rec.paid_at || ''
      const paidAtDate = paymentDate ? new Date(paymentDate) : null

      return {
        id: rec.id,
        employee_id: rec.employee_id,
        employee_name: employee?.employee_name ?? '',
        employee_number: employee?.employee_number ?? '',
        department: employee?.department ?? null,
        amount: Number(rec.net_salary ?? rec.gross_salary ?? 0),
        payment_method: rec.payment_method,
        payment_date: paymentDate,
        reference: rec.payment_reference,
        status: rec.payment_status as 'paid' | 'failed' | 'pending' | 'processing',
        period_month: paidAtDate ? paidAtDate.getMonth() + 1 : 0,
        period_year: paidAtDate ? paidAtDate.getFullYear() : 0,
      }
    })

    return NextResponse.json({ data: historyRecords })
  } catch (err) {
    console.error('Payment history error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
