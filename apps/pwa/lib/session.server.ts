import { cookies } from 'next/headers'

export interface HrSession {
  token: string
  user_id: string
  email: string
  username: string
  full_name: string
  role: string
  company_id: string
  employee_id: string
}

export async function getSession(): Promise<HrSession | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('hr_session')?.value
  if (!raw) return null
  try {
    const str = raw.includes('%') ? decodeURIComponent(raw) : raw
    return JSON.parse(str) as HrSession
  } catch {
    return null
  }
}
