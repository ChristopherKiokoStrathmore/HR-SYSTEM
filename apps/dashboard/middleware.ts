import { NextResponse, type NextRequest } from 'next/server'
import { canAccessPath, normalizeRole } from '@/lib/rbac'

function sessionRole(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw.includes('%') ? decodeURIComponent(raw) : raw)
    return data?.role ?? null
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes handle their own auth — never gate them here
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const session = request.cookies.get('hr_session')?.value

  // 1. Authentication
  if (!session && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (session && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 2. Authorization (role → module). Unauthorized module access is sent to
  //    /forbidden so the user gets feedback instead of a silent bounce.
  if (session && !pathname.startsWith('/login')) {
    const role = normalizeRole(sessionRole(session))
    if (!canAccessPath(role, pathname)) {
      return NextResponse.redirect(new URL('/forbidden', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
