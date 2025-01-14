import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // If the cookie is updated, update the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // This will refresh the session if needed and get the user
  const { data: { user } } = await supabase.auth.getUser()

  // If there's no user and the request is for a protected route, redirect to sign in
  if (!user) {
    const url = new URL(request.url)
    if (isProtectedRoute(url.pathname)) {
      const redirectUrl = new URL('/sign-in', request.url)
      redirectUrl.searchParams.set('redirect_to', url.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

// Helper to check if a route should be protected
function isProtectedRoute(pathname: string): boolean {
  const publicRoutes = [
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/_next',
    '/api',
    '/favicon.ico',
  ]
  return !publicRoutes.some(route => pathname.startsWith(route))
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (static assets)
     * - api routes
     * - static file extensions (.jpg, .jpeg, .png, .gif, .ico, .svg, .webp)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|public/|api/|.*\\.(?:jpg|jpeg|png|gif|ico|svg|webp)$).*)',
  ],
}
