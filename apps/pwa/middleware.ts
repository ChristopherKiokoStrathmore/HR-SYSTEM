import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes handle their own auth — never gate them here
  if (pathname.startsWith('/api/')) return NextResponse.next()

  const session = request.cookies.get('hr_session')?.value
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.png$).*)'],
}
