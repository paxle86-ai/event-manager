// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/middleware' // Chúng ta sẽ tạo file này

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request)

  // Refresh session if expired - recommended by Supabase
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // Nếu chưa đăng nhập VÀ không phải đang ở trang login -> đá về trang login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Nếu đã đăng nhập VÀ đang ở trang login -> đá về trang chủ
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}