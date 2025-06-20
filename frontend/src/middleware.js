import { NextResponse } from 'next/server'

export function middleware(request) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  const role = request.cookies.get('userRole')?.value

  // Block /admin if not admin or superadmin
  if (pathname.startsWith('/admin') && role !== 'admin' && role !== 'superadmin') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Block /superadmin if not superadmin
  if (pathname.startsWith('/superadmin') && role !== 'superadmin') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/superadmin/:path*'],
}
