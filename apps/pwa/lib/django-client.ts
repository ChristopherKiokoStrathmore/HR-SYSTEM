/**
 * Server-side helper to call the Django HR-API with the signed-in
 * employee's identity (from the hr_session cookie) forwarded as
 * X-User-* / X-Company-Id headers, service-key authenticated. Replaces
 * direct Supabase queries — Supabase is no longer reachable.
 */
import type { HRSession } from './session'

const DJANGO_API = process.env.HR_API_URL ?? 'http://localhost:8000/api'
const SERVICE_KEY = process.env.HR_SERVICE_KEY ?? ''

function headersFor(session: HRSession | null) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(SERVICE_KEY ? { 'X-Service-Key': SERVICE_KEY } : {}),
    ...(session?.userId ? { 'X-User-Id': session.userId } : {}),
    ...(session?.role ? { 'X-User-Role': session.role } : {}),
    ...(session?.email ? { 'X-User-Email': session.email } : {}),
    ...(session?.companyId ? { 'X-Company-Id': session.companyId } : {}),
  }
}

// ServiceKeyAuthentication resolves tenant scoping from a `company_id`
// query param/body field (not just the X-Company-Id header), so every
// call — not just GETs — needs it appended to the URL.
function buildUrl(session: HRSession | null, path: string, params?: Record<string, string | number | boolean | undefined>) {
  let url = `${DJANGO_API}${path}`
  const sp = new URLSearchParams()
  if (session?.companyId) sp.append('company_id', session.companyId)
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== '') sp.append(k, String(v))
  }
  const qs = sp.toString()
  if (qs) url += `?${qs}`
  return url
}

async function parseResponse<T>(res: Response): Promise<{ data: T | null; error: string | null; status: number }> {
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    return { data: null, error: (json && json.error) || res.statusText, status: res.status }
  }
  // DRF paginated response has {count, results}; flat array/object otherwise
  if (json && typeof json === 'object' && 'results' in json) {
    return { data: json.results as T, error: null, status: res.status }
  }
  return { data: json as T, error: null, status: res.status }
}

export async function djangoGet<T = unknown>(
  session: HRSession | null,
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(buildUrl(session, path, params), { headers: headersFor(session), cache: 'no-store' })
    return await parseResponse<T>(res)
  } catch (err) {
    return { data: null, error: String(err), status: 0 }
  }
}

async function send<T>(method: 'POST' | 'PATCH' | 'PUT', session: HRSession | null, path: string, body: unknown) {
  try {
    const res = await fetch(buildUrl(session, path), {
      method,
      headers: headersFor(session),
      body: JSON.stringify(body),
    })
    return await parseResponse<T>(res)
  } catch (err) {
    return { data: null, error: String(err), status: 0 }
  }
}

export function djangoPost<T = unknown>(session: HRSession | null, path: string, body: unknown) {
  return send<T>('POST', session, path, body)
}

export function djangoPatch<T = unknown>(session: HRSession | null, path: string, body: unknown) {
  return send<T>('PATCH', session, path, body)
}

export function djangoPut<T = unknown>(session: HRSession | null, path: string, body: unknown) {
  return send<T>('PUT', session, path, body)
}
