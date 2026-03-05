import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/': ['admin', 'manager'],
  '/board/meetings': ['admin', 'manager'],
  '/board/proposals': ['admin', 'manager'],
  '/portfolio': ['admin', 'manager'],
  '/forge': ['admin'],
  '/admin': ['admin'],
}

const PARTNER_HOME = '/board/todo'

export async function middleware(request: NextRequest) {
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
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const pathname = request.nextUrl.pathname
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const pathname = request.nextUrl.pathname
  if (pathname === '/login') {
    return response
  }

  const allowedRoles = ROUTE_PERMISSIONS[pathname]
  if (allowedRoles) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role || 'partner'

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL(PARTNER_HOME, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}