import { cookies } from 'next/headers'

export interface HRSession {
  token: string
  userId: string
  email: string
  fullName: string
  role: string
  companyId: string
  employeeId: string
}

export async function getSession(): Promise<HRSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('hr_session')?.value
    if (!raw) return null
    return JSON.parse(raw) as HRSession
  } catch {
    return null
  }
}
