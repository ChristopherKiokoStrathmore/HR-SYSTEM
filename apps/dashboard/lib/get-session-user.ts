import { cookies } from 'next/headers'

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('hr_session')?.value
    if (!raw) return null
    const data = JSON.parse(raw)
    // Session cookie is flat: { token, user_id, email, role, ... }
    const id = data?.user_id ?? data?.user?.id
    return id != null ? String(id) : null
  } catch {
    return null
  }
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('hr_session')?.value
    if (!raw) return null
    const data = JSON.parse(raw)
    return data?.token ?? null
  } catch {
    return null
  }
}
