import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const PWA_URL = process.env.NEXT_PUBLIC_PWA_URL ?? 'https://hr-system-pwa-sheerlogic.vercel.app'

// Routes that managers cannot access
const HR_ADMIN_ONLY = ['/payroll', '/recruitment', '/onboarding', '/medical', '/reports']
// Routes that only super_admin + hr_admin can access
const SUPER_ONLY: string[] = []

function getSupabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

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

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  // Allow static assets and API routes through without role checks
  if (pathname.startsWith('/api/')) return response

  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Role check — only for authenticated non-login pages
  if (session) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (serviceKey) {
      const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
        auth: { persistSession: false },
      })
      const { data: dbUser } = await service
        .from('users')
        .select('role, is_active')
        .eq('email', session.user.email!)
        .eq('is_deleted', false)
        .single()

      const role = dbUser?.role as string | undefined

      // Employees belong on the PWA, not the dashboard
      if (role === 'employee' || (dbUser && !dbUser.is_active)) {
        return NextResponse.redirect(PWA_URL)
      }

      // Manager: block HR-admin-only sections
      if (role === 'manager') {
        const blocked = HR_ADMIN_ONLY.some(p => pathname === p || pathname.startsWith(p + '/'))
        if (blocked) return NextResponse.redirect(new URL('/', request.url))
      }

      // Super-only routes (none currently, but wired up for future use)
      if (SUPER_ONLY.some(p => pathname === p || pathname.startsWith(p + '/'))) {
        if (role !== 'super_admin') return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
