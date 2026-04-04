import { NextResponse, type NextRequest } from 'next/server'

const AUTH_URL = process.env['NEXT_PUBLIC_AUTH_URL'] ?? 'http://localhost:3001'

const PUBLIC_PATHS = ['/_next', '/favicon.ico', '/api']

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
    const returnTo = encodeURIComponent(request.nextUrl.toString())
    return NextResponse.redirect(`${AUTH_URL}/login?returnTo=${returnTo}`)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
