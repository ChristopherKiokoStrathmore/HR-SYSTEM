import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

/**
 * Returns the authenticated user's ID by reading the session cookie.
 * Use this alongside the service-role client in API routes that need to
 * record which user performed an action (created_by, run_by, etc.).
 */
export async function getSessionUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (_name: string, _value: string, _options: CookieOptions) => {},
        remove: (_name: string, _options: CookieOptions) => {},
      },
    }
  )
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      // Handle invalid refresh token gracefully
      console.error('Auth error in getSessionUserId:', error.message)
      return null
    }
    return session?.user.id ?? null
  } catch (err) {
    console.error('Unexpected auth error:', err)
    return null
  }
}
