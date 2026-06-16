/**
 * Server-side helper to call the Django HR-API with service-key auth.
 * Use this in Next.js API route handlers instead of the Supabase client.
 */

const DJANGO_API = process.env.HR_API_URL ?? 'http://localhost:8000/api'
const SERVICE_KEY = process.env.HR_SERVICE_KEY ?? ''
const API_TOKEN = process.env.HR_API_TOKEN ?? ''

function baseHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(SERVICE_KEY ? { 'X-Service-Key': SERVICE_KEY } : {}),
    ...(API_TOKEN ? { Authorization: `Token ${API_TOKEN}` } : {}),
  }
}

export async function djangoGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ data: T | null; error: string | null; count?: number }> {
  try {
    let url = `${DJANGO_API}${path}`
    if (params) {
      const sp = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== '') sp.append(k, String(v))
      }
      const qs = sp.toString()
      if (qs) url += `?${qs}`
    }
    const res = await fetch(url, { headers: baseHeaders(), cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text()
      return { data: null, error: body }
    }
    const json = await res.json()
    // DRF paginated response has {count, results}; flat array otherwise
    if (json && typeof json === 'object' && 'results' in json) {
      return { data: json.results as T, count: json.count ?? 0, error: null }
    }
    return { data: json as T, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

export async function djangoPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${DJANGO_API}${path}`, {
      method: 'POST',
      headers: baseHeaders(),
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: JSON.stringify(json) }
    return { data: json as T, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

export async function djangoPatch<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${DJANGO_API}${path}`, {
      method: 'PATCH',
      headers: baseHeaders(),
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) return { data: null, error: JSON.stringify(json) }
    return { data: json as T, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

/** Convenience: returns {data: [], count: 0} — use for routes that have no Django equivalent yet. */
export function emptyList<T = unknown>() {
  return { data: [] as T[], count: 0, error: null }
}
