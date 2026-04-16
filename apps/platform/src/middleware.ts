import { NextResponse, type NextRequest } from 'next/server'

const AUTH_URL = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

const PUBLIC_PATHS = ['/_next/data', '/api']

/**
 * Lightweight middleware: redirect unauthenticated requests to the auth app.
 * Token presence is verified client-side in AppShell for richer error handling;
 * this middleware guards against direct navigation to protected routes.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow root (redirects to /dashboard via page.tsx)
  if (pathname === '/') return NextResponse.next()

  // Check for access token in cookies (set by auth app on cross-origin login)
  const token = request.cookies.get('access_token')?.value

  if (!token) {
    // In development with explicit opt-in, skip the server-side redirect so the page loads and
    // the client-side AppShell can handle auth (reads token from cookie/storage
    // after cross-port login). The AppShell still redirects to auth if missing.
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.SKIP_MIDDLEWARE_AUTH === 'true'
    ) {
      console.warn(
        '[MIDDLEWARE] Skipping server-side auth check (SKIP_MIDDLEWARE_AUTH=true in development)',
      )
      return NextResponse.next()
    }
    const url = new URL('/login', AUTH_URL)
    url.searchParams.set('returnTo', request.nextUrl.toString())
    return NextResponse.redirect(url.toString())
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
