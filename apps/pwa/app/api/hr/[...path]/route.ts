export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session.server'
import { getDb } from '@/lib/db.server'

const HR_API_URL = process.env.HR_API_URL || 'https://hrmanagementapi-production-dc59.up.railway.app/api'
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY || ''

const ALLOWED_PREFIXES = [
  'overtime',
  'leave-recalls',
  'reimbursements',
  'attendance',
  'certificates',
]

async function proxy(req: NextRequest, params: { path: string[] }) {
  if (!ALLOWED_PREFIXES.includes(params.path[0])) {
    return NextResponse.json({ error: 'Unknown HR API path' }, { status: 404 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const path = params.path.join('/')
  const search = new URL(req.url).search
  const url = `${HR_API_URL}/${path}${path.endsWith('/') ? '' : '/'}${search}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(HR_SERVICE_KEY ? { 'X-Service-Key': HR_SERVICE_KEY } : {}),
    'X-User-Id': session.user_id,
    'X-User-Role': session.role,
    'X-User-Email': session.email,
    'X-Company-Id': session.company_id,
  }

  let body: string | undefined
  if (req.method !== 'GET') {
    try {
      const json = await req.json()
      if (json && typeof json === 'object') {
        json.company_id = json.company_id ?? session.company_id

        // Stamp employee id if we can look it up from the DB
        if ('employee_id' in json || ['overtime', 'leave-recalls'].includes(params.path[0])) {
          const sql = getDb()
          if (sql) {
            const rows = await sql`
              SELECT id, manager_id FROM employee_profiles
              WHERE user_id = ${session.user_id} AND is_deleted = false
              LIMIT 1
            `.catch(() => [])
            const emp = rows[0]
            if (emp) {
              if ('employee_id' in json) json.employee_id = emp.id
              if (emp.manager_id && !json.manager_id && ['overtime', 'leave-recalls'].includes(params.path[0])) {
                json.manager_id = emp.manager_id
              }
            }
          }
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
