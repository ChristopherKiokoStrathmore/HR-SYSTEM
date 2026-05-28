/**
 * HR-API Django Backend Client
 *
 * Utility for making requests to the Django HR-API backend.
 * Used for payroll operations and PesaPal payment integration.
 */

const HR_API_URL = process.env.HR_API_URL || 'http://localhost:8000/api'
const HR_API_TOKEN = process.env.HR_API_TOKEN || ''
const HR_SERVICE_KEY = process.env.HR_SERVICE_KEY || ''

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
