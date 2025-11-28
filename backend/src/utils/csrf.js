import { doubleCsrf } from "csrf-csrf"

// CSRF cookie options must be static values (library evaluates at initialization)
// For cross-domain scenarios, set COOKIE_SAMESITE=none in environment
// The library doesn't support per-request function evaluation
const sameSiteValue = process.env.COOKIE_SAMESITE 
  ? process.env.COOKIE_SAMESITE.toLowerCase()
  : "lax"; // Default to 'lax' for same-domain (more secure)

// Secure must be true if SameSite=None, or in production
const secureValue = sameSiteValue === "none" || process.env.NODE_ENV === "production";

export const {
  doubleCsrfProtection,
  generateToken: generateCsrfToken,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'change-me',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: sameSiteValue, // Static value (library limitation)
    secure: secureValue, // Static value (library limitation)
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
})

export default { doubleCsrfProtection, generateCsrfToken }