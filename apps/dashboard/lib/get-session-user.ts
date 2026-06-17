import { cookies } from 'next/headers'

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('hr_session')?.value
    if (!raw) return null
    const data = JSON.parse(raw)
    const id = data?.user?.id
    return id != null ? String(id) : null
  } catch {
    return null
  }
}
