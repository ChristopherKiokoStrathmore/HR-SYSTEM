import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function getSupabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabaseKey(),
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Try to get the session, handling invalid refresh token errors
  let session = null
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      // If refresh token is invalid, clear auth cookies and redirect to login
      if (error.code === 'refresh_token_not_found' || error.message?.includes('Refresh Token')) {
        // Clear Supabase auth cookies
        const cookiesToClear = ['sb-access-token', 'sb-refresh-token']
        for (const cookieName of cookiesToClear) {
          response.cookies.delete(cookieName)
        }
        // Also clear any cookies that start with sb-
        request.cookies.getAll().forEach((cookie) => {
          if (cookie.name.startsWith('sb-')) {
            response.cookies.delete(cookie.name)
          }
        })

        if (!pathname.startsWith('/login')) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
        return response
      }
    }
    session = data.session
  } catch (err) {
    // Handle any unexpected auth errors gracefully
    console.error('Auth error in middleware:', err)
    if (!pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
