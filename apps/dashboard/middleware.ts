import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths that don't require auth
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.match(/\.(png|ico|svg|jpg|jpeg|webp|woff|woff2)$/)
  ) {
    return NextResponse.next()
  }

  const session = request.cookies.get('hr_session')?.value
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    JSON.parse(session)
  } catch {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.set('hr_session', '', { maxAge: 0, path: '/' })
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
