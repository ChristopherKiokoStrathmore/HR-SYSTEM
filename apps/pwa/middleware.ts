import { NextResponse, type NextRequest } from 'next/server'

const publicRoutes = ['/login']
// Auth API routes must always pass through unredirected — they're what
// *establishes* the session cookie, so gating them on its presence would
// make login impossible (and redirecting an API POST returns HTML, not
// JSON, which breaks the client's fetch().
const publicApiPrefixes = ['/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (publicApiPrefixes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request: { headers: request.headers } })
  }

  const session = request.cookies.get('hr_session')?.value
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return NextResponse.next({ request: { headers: request.headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|.*\\.png$).*)'],
}
