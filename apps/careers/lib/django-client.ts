/**
 * Server-side helper to call the Django HR-API recruitment endpoints
 * (apps.recruitment) with service-key auth. Replaces direct Supabase
 * queries — Supabase is no longer reachable.
 */

const DJANGO_API = process.env.HR_API_URL ?? 'http://localhost:8000/api'
const SERVICE_KEY = process.env.HR_SERVICE_KEY ?? ''

function baseHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(SERVICE_KEY ? { 'X-Service-Key': SERVICE_KEY } : {}),
  }
}

export async function djangoGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<{ data: T | null; error: string | null; status: number }> {
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
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: (json && json.error) || res.statusText, status: res.status }
    }
    return { data: json as T, error: null, status: res.status }
  } catch (err) {
    return { data: null, error: String(err), status: 0 }
  }
}

export async function djangoPost<T = unknown>(
  path: string,
  body: unknown,
): Promise<{ data: T | null; error: string | null; status: number }> {
  try {
    const res = await fetch(`${DJANGO_API}${path}`, {
      method: 'POST',
      headers: baseHeaders(),
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: (json && json.error) || res.statusText, status: res.status }
    }
    return { data: json as T, error: null, status: res.status }
  } catch (err) {
    return { data: null, error: String(err), status: 0 }
  }
}
