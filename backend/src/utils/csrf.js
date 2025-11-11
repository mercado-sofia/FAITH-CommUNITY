import { doubleCsrf } from "csrf-csrf"

const sameSiteOpt = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase()

export const {
  doubleCsrfProtection,
  generateToken: generateCsrfToken,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'change-me',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: sameSiteOpt,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
})

export default { doubleCsrfProtection, generateCsrfToken }


