/**
 * HR-API Django Backend Client
 *
 * Utility for making requests to the Django HR-API backend.
 * Used for payroll operations and PesaPal payment integration.
 */

const HR_API_URL = process.env.HR_API_URL || 'http://localhost:8000/api'
const HR_API_TOKEN = process.env.HR_API_TOKEN || ''
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY || ''

/**
 * Identity propagation (RBAC): every proxied call forwards the session user's
 * id/email/role/company to Django via X-User-* headers so the backend can
 * enforce role-based access (PayrollHROnly, HasModulePermission). Once all
 * environments send these, Django's RBAC_STRICT can be enabled.
 * Role/company are read from the Supabase `users` table with the service-role
 * key and cached briefly to avoid a lookup per call.
 */
const identityCache = new Map<string, { role: string; companyId: string | null; email: string; at: number }>()
const IDENTITY_TTL_MS = 60_000

async function identityHeaders(): Promise<Record<string, string>> {
  try {
    const { getSessionUserId } = await import('./get-session-user')
    const userId = await getSessionUserId()
    if (!userId) return {}

    let cached = identityCache.get(userId)
    if (!cached || Date.now() - cached.at > IDENTITY_TTL_MS) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!supabaseUrl || !serviceKey) return { 'X-User-Id': userId }
      const res = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=role,company_id,email&limit=1`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      )
      if (!res.ok) return { 'X-User-Id': userId }
      const rows = (await res.json()) as Array<{ role?: string; company_id?: string; email?: string }>
      const row = rows[0]
      if (!row) return { 'X-User-Id': userId }
      cached = {
        role: row.role ?? '',
        companyId: row.company_id ?? null,
        email: row.email ?? '',
        at: Date.now(),
      }
      identityCache.set(userId, cached)
    }

    const headers: Record<string, string> = { 'X-User-Id': userId }
    if (cached.role) headers['X-User-Role'] = cached.role
    if (cached.email) headers['X-User-Email'] = cached.email
    if (cached.companyId) headers['X-Company-Id'] = cached.companyId
    return headers
  } catch {
    // Outside a request scope (build, scripts) or auth failure: omit headers;
    // Django falls back to legacy service-key trust (audit-logged).
    return {}
  }
}

export class HRApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'HRApiError'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Make a request to the HR-API Django backend
 */
export async function hrApi<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options

  // Build URL with query params
  let url = `${HR_API_URL}${endpoint}`
  if (params) {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    }
    const queryString = searchParams.toString()
    if (queryString) {
      url += `?${queryString}`
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(HR_SERVICE_KEY ? { 'X-Service-Key': HR_SERVICE_KEY } : {}),
      ...(HR_API_TOKEN ? { Authorization: `Token ${HR_API_TOKEN}` } : {}),
      ...(await identityHeaders()),
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, fetchOptions)

  // Handle empty responses (204 No Content)
  if (response.status === 204) {
    return {} as T
  }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    // If response is not JSON, throw with status text
    if (!response.ok) {
      throw new HRApiError(response.statusText, response.status)
    }
    return {} as T
  }

  if (!response.ok) {
    const errorMessage =
      (data as { detail?: string; error?: string; message?: string })?.detail ||
      (data as { error?: string })?.error ||
      (data as { message?: string })?.message ||
      'Request failed'
    throw new HRApiError(errorMessage, response.status, data)
  }

  return data as T
}

// Convenience methods
export const hrApiGet = <T>(endpoint: string, params?: RequestOptions['params']) =>
  hrApi<T>(endpoint, { method: 'GET', params })

export const hrApiPost = <T>(endpoint: string, body?: unknown) =>
  hrApi<T>(endpoint, { method: 'POST', body })

export const hrApiPut = <T>(endpoint: string, body?: unknown) =>
  hrApi<T>(endpoint, { method: 'PUT', body })

export const hrApiPatch = <T>(endpoint: string, body?: unknown) =>
  hrApi<T>(endpoint, { method: 'PATCH', body })

export const hrApiDelete = <T>(endpoint: string) =>
  hrApi<T>(endpoint, { method: 'DELETE' })
