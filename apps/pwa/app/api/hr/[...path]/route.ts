export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { djangoGet } from '@/lib/django-client'

/**
 * PWA proxy to the Django HR-API (overtime, leave recalls, attendance
 * check-in/pings). Forwards the session user's identity headers so Django
 * enforces RBAC — employees see their own data, managers their queues, and
 * payroll/geofence-dashboard endpoints stay server-side denied.
 */
const HR_API_URL = process.env.HR_API_URL || 'http://localhost:8000/api'
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY || ''

const ALLOWED_PREFIXES = [
  'overtime',
  'leave-recalls',
  'reimbursements',
  'attendance', // check-in/, ping/, rate is HQ-scoped server-side
  'certificates',
]

async function proxy(req: NextRequest, params: { path: string[] }) {
  if (!ALLOWED_PREFIXES.includes(params.path[0])) {
    return NextResponse.json({ error: 'Unknown HR API path' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const path = params.path.join('/')
  const search = new URL(req.url).search
  const url = `${HR_API_URL}/${path}${path.endsWith('/') ? '' : '/'}${search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(HR_SERVICE_KEY ? { 'X-Service-Key': HR_SERVICE_KEY } : {}),
    'X-User-Id': session.userId,
    ...(session.role ? { 'X-User-Role': session.role } : {}),
    ...(session.email ? { 'X-User-Email': session.email } : {}),
    ...(session.companyId ? { 'X-Company-Id': session.companyId } : {}),
  }

  let body: string | undefined
  if (req.method !== 'GET') {
    try {
      const json = await req.json()
      // Stamp the caller's employee/company/manager ids so the PWA can't act
      // for others, and manager notifications (SMS/email one-tap) fire.
      if (session.employeeId && json && typeof json === 'object') {
        if ('employee_id' in json) {
          json.employee_id = session.employeeId
        }
        json.company_id = json.company_id ?? session.companyId
        if (!json.manager_id && ['overtime', 'leave-recalls'].includes(params.path[0])) {
          const { data: employee } = await djangoGet<{ manager_id: string | null }>(
            session, `/all-employees/${session.employeeId}/`,
          )
          if (employee?.manager_id) json.manager_id = employee.manager_id
        }
      }
      body = JSON.stringify(json)
    } catch {
      body = undefined
    }
  }

  try {
    const res = await fetch(url, { method: req.method, headers, body })
    const data = res.status === 204 ? {} : await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (err) {
    console.error(`PWA HR proxy error for ${path}:`, err)
    return NextResponse.json({ error: 'HR API unreachable' }, { status: 502 })
  }
}

type Ctx = { params: { path: string[] } }

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
