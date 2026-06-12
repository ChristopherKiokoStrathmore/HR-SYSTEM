export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * Catch-all proxy to the Django HR-API for the new Sheer Logic modules.
 * /api/hr/<path> → ${HR_API_URL}/<path>/ with service key + identity headers
 * (role enforcement happens in Django: PayrollHROnly, HasModulePermission).
 *
 * Allowlisted prefixes only — everything else 404s so this can't become a
 * generic tunnel to admin or payment-config endpoints.
 */
const ALLOWED_PREFIXES = [
  'disciplinary',
  'exits',
  'certificates',
  'allowance-types',
  'allowances',
  'deduction-types',
  'deductions',
  'overtime',
  'reimbursements',
  'statutory-rates',
  'minimum-wages',
  'compliance-alerts',
  'leave-recalls',
  'work-zones',
  'geofence-violations',
  'geofence',
  'attendance',
  'attendance-events',
  'approver-config',
  'payroll-approvals',
  'payroll-documents',
  'payroll-workflow',
  'share',
  'rbac',
  'notifications',
  'audit',
]

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join('/')
  if (!ALLOWED_PREFIXES.includes(params.path[0])) {
    return NextResponse.json({ error: 'Unknown HR API path' }, { status: 404 })
  }

  const method = req.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  if (method !== 'GET') {
    const limited = await checkRateLimit(req, 'moderate')
    if (limited) return limited
  }

  const search = new URL(req.url).searchParams
  const queryParams: Record<string, string> = {}
  search.forEach((value, key) => {
    queryParams[key] = value
  })

  let body: unknown
  if (method !== 'GET' && req.headers.get('content-length') !== '0') {
    try {
      body = await req.json()
    } catch {
      body = undefined
    }
  }

  try {
    // Django router paths end with a trailing slash
    const endpoint = `/${path}${path.endsWith('/') ? '' : '/'}`
    const data = await hrApi<unknown>(endpoint, { method, body, params: queryParams })
    return NextResponse.json(data ?? {})
  } catch (err) {
    if (err instanceof HRApiError) {
      return NextResponse.json(
        { error: err.message, details: err.data },
        { status: err.status }
      )
    }
    console.error(`HR API proxy error for ${path}:`, err)
    return NextResponse.json({ error: 'HR API request failed' }, { status: 502 })
  }
}

type Ctx = { params: { path: string[] } }

export async function GET(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
export async function POST(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
export async function PUT(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
export async function PATCH(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
export async function DELETE(req: NextRequest, { params }: Ctx) {
  return proxy(req, params)
}
