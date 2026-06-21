export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fallbackUser = {
    id: session.user_id,
    full_name: session.full_name,
    email: session.email,
    avatar_url: null,
    preferred_language: 'en',
    phone: null,
  }

  const sql = getDb()
  if (!sql) return NextResponse.json({ data: { user: fallbackUser, employee: null } })

  try {
    const [users, employees] = await Promise.all([
      sql`
        SELECT id, full_name, email, avatar_url, preferred_language, phone
        FROM users WHERE id = ${session.user_id} LIMIT 1
      `,
      sql`
        SELECT ep.*, c.name AS company_name, c.logo_url AS company_logo_url
        FROM employee_profiles ep
        LEFT JOIN companies c ON c.id = ep.company_id
        WHERE ep.user_id = ${session.user_id} AND ep.is_deleted = false
        LIMIT 1
      `,
    ])

    const user = users[0] ?? fallbackUser
    const emp = employees[0] ?? null
    const employee = emp
      ? {
          id: emp.id,
          employee_number: emp.employee_number,
          job_title: emp.job_title,
          department: emp.department,
          company_id: emp.company_id,
          worker_class: emp.worker_class ?? 'white_collar',
          salary: emp.salary,
          payment_method: emp.payment_method,
          bank_name: emp.bank_name,
          bank_account: emp.bank_account,
          mpesa_number: emp.mpesa_number,
          airtel_number: emp.airtel_number,
          start_date: emp.start_date,
          company: emp.company_name ? { name: emp.company_name, logo_url: emp.company_logo_url } : null,
        }
      : null

    return NextResponse.json({ data: { user, employee } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
