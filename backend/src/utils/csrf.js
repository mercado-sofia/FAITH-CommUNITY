import { doubleCsrf } from "csrf-csrf"

// Use SameSite=Lax for better cookie compatibility
// With Next.js rewrites, requests are same-origin, so Lax works perfectly
const sameSiteOpt = process.env.COOKIE_SAMESITE 
  ? (process.env.COOKIE_SAMESITE).toLowerCase()
  : "lax";

export const {
  doubleCsrfProtection,
  generateToken: generateCsrfToken,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'change-me',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: sameSiteOpt,
    secure: process.env.NODE_ENV === 'production', // false in dev (localhost), true in prod (HTTPS)
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
})

export default { doubleCsrfProtection, generateCsrfToken }