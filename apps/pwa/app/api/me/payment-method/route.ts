export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  try {
    const emp = await sql`
      SELECT id, payment_method, bank_name, bank_account, mpesa_number, airtel_number
      FROM employee_profiles
      WHERE user_id = ${session.user_id} AND is_deleted = false
      LIMIT 1
    `
    if (!emp[0]) return NextResponse.json({ error: 'No employee profile found' }, { status: 404 })

    return NextResponse.json({ data: emp[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()
  if (!sql) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })

  const body = await req.json()
  const { payment_method, bank_name, bank_account, mpesa_number, airtel_number } = body as {
    payment_method: 'bank' | 'mpesa' | 'airtel'
    bank_name?: string; bank_account?: string
    mpesa_number?: string; airtel_number?: string
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

  try {
    const rows = await sql`
      UPDATE employee_profiles SET
        payment_method = ${payment_method},
        bank_name = ${payment_method === 'bank' ? (bank_name ?? null) : null},
        bank_account = ${payment_method === 'bank' ? (bank_account ?? null) : null},
        mpesa_number = ${payment_method === 'mpesa' ? (mpesa_number ?? null) : null},
        airtel_number = ${payment_method === 'airtel' ? (airtel_number ?? null) : null}
      WHERE user_id = ${session.user_id} AND is_deleted = false
      RETURNING *
    `
    if (!rows[0]) return NextResponse.json({ error: 'No employee profile found' }, { status: 404 })
    return NextResponse.json({ data: rows[0] })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
