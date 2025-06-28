import { NextResponse } from "next/server"

export function middleware(request) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  const role = request.cookies.get("userRole")?.value

  console.log("🛡️ Middleware Check:", {
    path: pathname,
    role: role,
    timestamp: new Date().toISOString(),
    allCookies: request.cookies
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; "),
  })

  // Allow login page for everyone
  if (pathname === "/login") {
    console.log("✅ Login page - allowing access")
    return NextResponse.next()
  }

  // Block /admin if not admin or superadmin
  if (pathname.startsWith("/admin")) {
    if (role !== "admin" && role !== "superadmin") {
      console.log("❌ Admin access denied - redirecting to login", { role })
      url.pathname = "/login"
      return NextResponse.redirect(url)
    } else {
      console.log("✅ Admin access granted", { role })
    }
  }

  // Block /superadmin if not superadmin
  if (pathname.startsWith("/superadmin")) {
    if (role !== "superadmin") {
      console.log("❌ Superadmin access denied - redirecting to login", { role })
      url.pathname = "/login"
      return NextResponse.redirect(url)
    } else {
      console.log("✅ Superadmin access granted", { role })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/superadmin/:path*"],
}
