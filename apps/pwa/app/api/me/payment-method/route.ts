export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet, djangoPut } from '@/lib/django-client'

/**
 * GET/PUT /api/me/payment-method
 *
 * Lets employees view/update their own payment method and account details.
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'No employee profile found' }, { status: 404 })

  const { data, error } = await djangoGet(session, `/employees/${session.employeeId}/payment_method/`)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.employeeId) return NextResponse.json({ error: 'No employee profile found' }, { status: 404 })

  const body = await req.json()
  const { payment_method, bank_name, bank_account, mpesa_number, airtel_number } = body as {
    payment_method: 'bank' | 'mpesa' | 'airtel'
    bank_name?: string
    bank_account?: string
    mpesa_number?: string
    airtel_number?: string
  }

  if (!['bank', 'mpesa', 'airtel'].includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
  }
  if (payment_method === 'bank' && (!bank_name || !bank_account)) {
    return NextResponse.json({ error: 'Bank name and account number are required' }, { status: 400 })
  }
  if (payment_method === 'mpesa' && !mpesa_number) {
    return NextResponse.json({ error: 'M-Pesa number is required' }, { status: 400 })
  }
  if (payment_method === 'airtel' && !airtel_number) {
    return NextResponse.json({ error: 'Airtel number is required' }, { status: 400 })
  }

  const { data, error } = await djangoPut(session, `/employees/${session.employeeId}/payment_method/`, {
    payment_method,
    bank_name: payment_method === 'bank' ? bank_name : null,
    bank_account: payment_method === 'bank' ? bank_account : null,
    mpesa_number: payment_method === 'mpesa' ? mpesa_number : null,
    airtel_number: payment_method === 'airtel' ? airtel_number : null,
  })

  if (error) {
    console.error('Payment method update error:', error)
    return NextResponse.json({ error }, { status: 500 })
  }
  return NextResponse.json({ data })
}
