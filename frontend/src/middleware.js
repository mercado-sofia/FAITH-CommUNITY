import { NextResponse } from "next/server"

export function middleware(request) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  const role = request.cookies.get("userRole")?.value

  if (process.env.NODE_ENV !== "production") {
    console.log("🛡️ Middleware Check:", {
      path: pathname,
      role: role,
      timestamp: new Date().toISOString(),
      isInvitationPath: pathname.startsWith("/admin/invitation/accept"),
    })
  }

  // Allow login page for everyone
  if (pathname === "/login") {
    // Login page - allowing access
    return NextResponse.next()
  }

  // Allow admin invitation acceptance page for everyone (no authentication required)
  if (pathname.startsWith("/admin/invitation/accept")) {
    console.log("✅ Invitation acceptance page - allowing access")
    return NextResponse.next()
  }

  // Block /admin if not admin or superadmin
  if (pathname.startsWith("/admin")) {
    if (role !== "admin" && role !== "superadmin") {
      // Admin access denied - redirecting to login
      url.pathname = "/login"
      return NextResponse.redirect(url)
    } else {
      // Admin access granted
    }
  }

  // Block /superadmin if not superadmin
  if (pathname.startsWith("/superadmin")) {
    if (role !== "superadmin") {
      // Superadmin access denied - redirecting to login
      url.pathname = "/login"
      return NextResponse.redirect(url)
    } else {
      // Superadmin access granted
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/superadmin/:path*"
  ],
}
