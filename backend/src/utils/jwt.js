import jwt from "jsonwebtoken"
import crypto from "crypto"
import db from "../database.js"

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m"
const REFRESH_TOKEN_TTL_MS = Number(process.env.REFRESH_TOKEN_TTL_MS || 7 * 24 * 60 * 60 * 1000)
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-env"
const JWT_ISSUER = process.env.JWT_ISS || "faith-community-api"
const JWT_AUDIENCE = process.env.JWT_AUD || "faith-community-client"

export function signAccessToken(payload) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return jwt.sign(
    { ...payload, iat: nowSeconds, iss: JWT_ISSUER, aud: JWT_AUDIENCE },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET, { issuer: JWT_ISSUER, audience: JWT_AUDIENCE })
}

export async function issueRefreshToken(userId, { userAgent, ipAddress } = {}) {
  const token = crypto.randomBytes(48).toString("hex")
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
  await db.execute(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)`,
    [userId, token, expiresAt, (userAgent || null), (ipAddress || null)]
  )
  return { token, expiresAt }
}

export async function rotateRefreshToken(oldToken, userId, { userAgent, ipAddress } = {}) {
  const connection = await db.getConnection?.() || null
  try {
    if (connection) await connection.beginTransaction()
    await db.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND user_id = ?`, [oldToken, userId])
    const { token, expiresAt } = await issueRefreshToken(userId, { userAgent, ipAddress })
    if (connection) await connection.commit()
    return { token, expiresAt }
  } catch (e) {
    if (connection) await connection.rollback()
    throw e
  } finally {
    if (connection) connection.release?.()
  }
}

export async function revokeAllUserRefreshTokens(userId) {
  await db.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [userId])
}

export async function revokeRefreshToken(token) {
  await db.execute(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND revoked_at IS NULL`, [token])
}

export async function findValidRefreshToken(token) {
  const [rows] = await db.execute(
    `SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`,
    [token]
  )
  return rows[0] || null
}

export function getAccessTokenCookieOptions(req = null) {
  // Convert ACCESS_TOKEN_TTL to seconds (e.g., "15m" = 900 seconds)
  const ttlMatch = ACCESS_TOKEN_TTL.match(/(\d+)([smhd])/);
  let seconds = 15 * 60; // Default 15 minutes
  
  if (ttlMatch) {
    const value = parseInt(ttlMatch[1]);
    const unit = ttlMatch[2];
    seconds = unit === 's' ? value : unit === 'm' ? value * 60 : unit === 'h' ? value * 3600 : value * 86400;
  }
  
  // CRITICAL: Express res.cookie() maxAge is in MILLISECONDS, not seconds!
  // Convert seconds to milliseconds
  const maxAgeMs = seconds * 1000;
  
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  // Debug logging (development only)
  if (isDevelopment) {
    console.log('[getAccessTokenCookieOptions] TTL calculation:', {
      ACCESS_TOKEN_TTL,
      ttlMatch,
      calculatedSeconds: seconds,
      maxAgeMs: maxAgeMs
    });
  }
  
  // IMPORTANT: For cross-origin cookies (localhost:3000 -> localhost:8080)
  // Chrome allows SameSite=None with Secure=false for localhost, but it's not reliable
  // Better approach: Use SameSite=Lax and ensure requests are same-site
  // OR use a proxy to make requests same-origin
  // For now, we'll use Lax which works for same-site navigation
  const sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : "lax"; // Changed from "none" to "lax" - works better for localhost
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false in dev (localhost), true in prod (HTTPS)
    sameSite: sameSiteValue,
    path: "/",
    maxAge: maxAgeMs, // Cookie maxAge is in MILLISECONDS for Express res.cookie()
  };
  
  // CRITICAL: Cookie domain handling for development vs production
  // When behind a proxy (Next.js rewrites), we MUST set domain to 'localhost' (without port)
  // Otherwise Express defaults to request host (localhost:8080), which browser rejects
  // Setting domain: 'localhost' makes cookie work for both localhost:3000 and localhost:8080
  if (process.env.COOKIE_DOMAIN) {
    // Explicit domain from env (production)
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (req && req.headers && req.headers['x-forwarded-host']) {
    // Behind a proxy - extract hostname from forwarded host and set as domain
    // This ensures cookie works for the frontend origin (localhost:3000)
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostParts = forwardedHost.split(':');
    cookieOptions.domain = hostParts[0]; // 'localhost' (without port)
  } else if (req && req.headers && req.headers.host && !isDevelopment) {
    // Production: Extract domain from host header (handles subdomains)
    // For example: app.example.com -> .example.com (leading dot for subdomain support)
    const host = req.headers.host;
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    
    // If it's a subdomain (has dots), use the root domain with leading dot
    // This allows cookies to work across subdomains
    if (hostname.includes('.') && !hostname.startsWith('localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        // Use root domain (e.g., .example.com)
        cookieOptions.domain = '.' + parts.slice(-2).join('.');
      }
    }
    // For exact hostname or localhost, don't set domain (uses exact host)
  } else if (isDevelopment) {
    // Development without proxy - set domain to 'localhost' to work across ports
    cookieOptions.domain = 'localhost';
  }
  // Production without explicit domain or proxy - don't set domain (uses exact host)
  
  // Final logging to verify cookie options are correct (development only)
  if (isDevelopment) {
    console.log('[getAccessTokenCookieOptions] Final cookie options:', {
      ...cookieOptions,
      maxAge: cookieOptions.maxAge,
      maxAgeInSeconds: Math.floor(cookieOptions.maxAge / 1000),
      domain: cookieOptions.domain
    });
  }
  
  return cookieOptions;
}

export function getRefreshCookieOptions(req = null) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  // IMPORTANT: For cross-origin cookies (localhost:3000 -> localhost:8080)
  // Use SameSite=Lax which works better for localhost
  const sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : "lax"; // Changed from "none" to "lax" - works better for localhost
  
  // CRITICAL: Express res.cookie() maxAge is in MILLISECONDS, not seconds!
  // REFRESH_TOKEN_TTL_MS is already in milliseconds, so use it directly
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // false in dev (localhost), true in prod (HTTPS)
    sameSite: sameSiteValue,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_MS, // Already in milliseconds
  };
  
  // CRITICAL: Cookie domain handling for development vs production
  // When behind a proxy (Next.js rewrites), we MUST set domain to 'localhost' (without port)
  // Otherwise Express defaults to request host (localhost:8080), which browser rejects
  // Setting domain: 'localhost' makes cookie work for both localhost:3000 and localhost:8080
  if (process.env.COOKIE_DOMAIN) {
    // Explicit domain from env (production)
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (req && req.headers && req.headers['x-forwarded-host']) {
    // Behind a proxy - extract hostname from forwarded host and set as domain
    // This ensures cookie works for the frontend origin (localhost:3000)
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostParts = forwardedHost.split(':');
    cookieOptions.domain = hostParts[0]; // 'localhost' (without port)
  } else if (req && req.headers && req.headers.host && !isDevelopment) {
    // Production: Extract domain from host header (handles subdomains)
    // For example: app.example.com -> .example.com (leading dot for subdomain support)
    const host = req.headers.host;
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    
    // If it's a subdomain (has dots), use the root domain with leading dot
    // This allows cookies to work across subdomains
    if (hostname.includes('.') && !hostname.startsWith('localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        // Use root domain (e.g., .example.com)
        cookieOptions.domain = '.' + parts.slice(-2).join('.');
      }
    }
    // For exact hostname or localhost, don't set domain (uses exact host)
  } else if (isDevelopment) {
    // Development without proxy - set domain to 'localhost' to work across ports
    cookieOptions.domain = 'localhost';
  }
  // Production without explicit domain or proxy - don't set domain (uses exact host)
  
  return cookieOptions;
}

/**
 * Get cookie options for clearing cookies (logout, password change, etc.)
 * Uses the same domain logic as getAccessTokenCookieOptions/getRefreshCookieOptions
 * to ensure cookies can be properly cleared in all deployment scenarios.
 * @param {Object} req - Express request object (optional)
 * @returns {Object} Cookie options with path and domain (if needed)
 */
export function getClearCookieOptions(req = null) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const clearOptions = { path: '/' };
  
  // Use the same domain logic as cookie setting functions
  if (process.env.COOKIE_DOMAIN) {
    // Explicit domain from env (production)
    clearOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (req && req.headers && req.headers['x-forwarded-host']) {
    // Behind a proxy - extract hostname from forwarded host and set as domain
    // This matches the logic used when setting cookies
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostParts = forwardedHost.split(':');
    clearOptions.domain = hostParts[0]; // Extract hostname without port
  } else if (req && req.headers && req.headers.host && !isDevelopment) {
    // Production: Extract domain from host header (handles subdomains)
    // This matches the logic used when setting cookies
    const host = req.headers.host;
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    
    // If it's a subdomain (has dots), use the root domain with leading dot
    if (hostname.includes('.') && !hostname.startsWith('localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        // Use root domain (e.g., .example.com)
        clearOptions.domain = '.' + parts.slice(-2).join('.');
      }
    }
    // For exact hostname or localhost, don't set domain (uses exact host)
  } else if (isDevelopment) {
    // Development without proxy - set domain to 'localhost' to work across ports
    clearOptions.domain = 'localhost';
  }
  // Production without explicit domain or proxy - don't set domain (uses exact host)
  // This matches the cookie setting logic
  
  return clearOptions;
}

export default {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
  findValidRefreshToken,
  getAccessTokenCookieOptions,
  getRefreshCookieOptions,
  getClearCookieOptions,
}


