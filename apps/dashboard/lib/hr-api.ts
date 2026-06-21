import { cookies } from 'next/headers'

const HR_API_URL = process.env.HR_API_URL || 'http://localhost:8000/api'
const HR_API_TOKEN = process.env.HR_API_TOKEN || ''
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY || ''

// Normalize legacy role slugs to the canonical RBAC chain understood by the
// Django backend (apps/core/permissions.py). Granular internal/deployed roles
// pass through unchanged.
function normalizeRole(role: string): string {
  switch (role) {
    case 'hr_admin':
      return 'hr'
    default:
      return role
  }
}

/**
 * Read the hr_session cookie and produce the X-User-* identity headers the
 * Django RBAC layer expects. Runs only in a request scope (route handlers);
 * returns {} otherwise so non-request callers degrade gracefully.
 */
async function identityHeaders(): Promise<Record<string, string>> {
  try {
    const store = await cookies()
    const raw = store.get('hr_session')?.value
    if (!raw) return {}
    const data = JSON.parse(raw.includes('%') ? decodeURIComponent(raw) : raw)
    const headers: Record<string, string> = {}
    if (data?.user_id) headers['X-User-Id'] = String(data.user_id)
    if (data?.role) headers['X-User-Role'] = normalizeRole(String(data.role))
    if (data?.email) headers['X-User-Email'] = String(data.email)
    if (data?.company_id) headers['X-Company-Id'] = String(data.company_id)
    if (data?.tenant_id) headers['X-Tenant-Id'] = String(data.tenant_id)
    return headers
  } catch {
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

  const identity = await identityHeaders()

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(HR_SERVICE_KEY ? { 'X-Service-Key': HR_SERVICE_KEY } : {}),
      ...(HR_API_TOKEN ? { Authorization: `Token ${HR_API_TOKEN}` } : {}),
      ...identity,
      ...headers,
    },
  }

  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(url, {
    ...fetchOptions,
    // 15s (was 8s): the Railway backend cold-starts when idle, and the dashboard
    // fires ~10 parallel requests on load — an 8s abort turned every cold-start
    // request into a 500. 15s rides out a typical cold boot.
    signal: AbortSignal.timeout(15_000),
  })

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
