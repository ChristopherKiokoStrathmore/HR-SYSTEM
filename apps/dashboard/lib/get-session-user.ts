import { getSession } from './session'

/**
 * Returns the authenticated user's ID from the session cookie.
 * Used in API routes that need to record which user performed an action.
 */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.userId ?? null
}
