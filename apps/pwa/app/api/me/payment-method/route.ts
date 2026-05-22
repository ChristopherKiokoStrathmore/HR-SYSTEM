export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createCookieClient, createServiceClient } from '@/lib/supabase-server'
import { resolveEmployeeContext, resolvePwaUserRecord } from '@/lib/employee-context'

/**
 * PUT /api/me/payment-method
 *
 * Allows employees to update their own payment method and account details.
 *
 * Body: {
 *   payment_method: 'bank' | 'mpesa' | 'airtel',
 *   bank_name?: string,
 *   bank_account?: string,
 *   mpesa_number?: string,
 *   airtel_number?: string
 * }
 */
export async function PUT(req: NextRequest) {
  const supabase = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  const resolvedUser = user ?? await resolvePwaUserRecord(service, null)
  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUser = resolvedUser as any as { id: string }
  const { employee } = await resolveEmployeeContext(service, authUser)

  if (!employee) {
    return NextResponse.json({ error: 'No employee profile found' }, { status: 404 })
  }

  const body = await req.json()
  const { payment_method, bank_name, bank_account, mpesa_number, airtel_number } = body as {
    payment_method: 'bank' | 'mpesa' | 'airtel'
    bank_name?: string
    bank_account?: string
    mpesa_number?: string
    airtel_number?: string
  }

  // Validate payment method
  if (!['bank', 'mpesa', 'airtel'].includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  }

  // Validate required fields based on payment method
  if (payment_method === 'bank') {
    if (!bank_name || !bank_account) {
      return NextResponse.json({ error: 'Bank name and account number are required' }, { status: 400 })
    }
  } else if (payment_method === 'mpesa') {
    if (!mpesa_number) {
      return NextResponse.json({ error: 'M-Pesa number is required' }, { status: 400 })
    }
  } else if (payment_method === 'airtel') {
    if (!airtel_number) {
      return NextResponse.json({ error: 'Airtel number is required' }, { status: 400 })
    }
  }

  // Update employee profile with new payment details
  // Clear other payment method fields when switching methods
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from('employee_profiles')
    .update({
      payment_method,
      bank_name: payment_method === 'bank' ? bank_name : null,
      bank_account: payment_method === 'bank' ? bank_account : null,
      mpesa_number: payment_method === 'mpesa' ? mpesa_number : null,
      airtel_number: payment_method === 'airtel' ? airtel_number : null,
    })
    .eq('id', employee.id)
    .select()
    .single()

  if (error) {
    console.error('Payment method update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

/**
 * GET /api/me/payment-method
 *
 * Returns the current employee's payment method details.
 */
export async function GET() {
  const supabase = await createCookieClient()
  const service = createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()

  const resolvedUser = user ?? await resolvePwaUserRecord(service, null)
  if (!resolvedUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authUser = resolvedUser as any as { id: string }
  const { employee } = await resolveEmployeeContext(service, authUser)

  if (!employee) {
    return NextResponse.json({ error: 'No employee profile found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service as any)
    .from('employee_profiles')
    .select('payment_method, bank_name, bank_account, mpesa_number, airtel_number')
    .eq('id', employee.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
