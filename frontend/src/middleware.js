import { NextResponse } from "next/server"

export function middleware(request) {
  // NOTE: This middleware is intentionally permissive
  // We let all requests through and let the layout components handle authentication
  // This is because:
  // 1. httpOnly cookies (access_token, refresh_token) are not accessible to middleware
  // 2. userRole cookie is set client-side after login, so there's a race condition
  // 3. Layout components can make API calls to verify authentication via httpOnly cookies
  
  // Layout components will handle:
  // - Checking authentication via backend API (reads httpOnly cookies)
  // - Redirecting to login if not authenticated
  // - Setting userRole cookie after successful auth check

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*"
  ],
}
