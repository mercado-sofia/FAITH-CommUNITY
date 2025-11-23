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
  
  // CRITICAL: Detect cross-domain scenarios (e.g., Vercel frontend + Railway backend)
  // For cross-domain, we MUST use SameSite=None with Secure=true
  // For same-domain, we can use SameSite=Lax (more secure)
  let sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : null; // Will be determined based on cross-domain detection
  
  // Detect if this is a cross-domain request
  const isCrossDomain = req && req.headers && req.headers.origin && req.headers.host && 
    req.headers.origin !== `https://${req.headers.host}` && 
    req.headers.origin !== `http://${req.headers.host}`;
  
  // If not explicitly set, determine based on cross-domain detection
  if (!sameSiteValue) {
    if (isCrossDomain) {
      // Cross-domain (e.g., Vercel -> Railway): MUST use None with Secure
      sameSiteValue = "none";
    } else if (isDevelopment) {
      // Development same-domain: Use Lax (works for localhost)
      sameSiteValue = "lax";
    } else {
      // Production same-domain: Use Lax (more secure)
      sameSiteValue = "lax";
    }
  }
  
  // CRITICAL: If SameSite=None, Secure MUST be true (browser requirement)
  // Override secure setting if SameSite=None is used
  const mustBeSecure = sameSiteValue === "none" || process.env.NODE_ENV === "production";
  
  const cookieOptions = {
    httpOnly: true,
    secure: mustBeSecure, // true for production or when SameSite=None
    sameSite: sameSiteValue,
    path: "/",
    maxAge: maxAgeMs, // Cookie maxAge is in MILLISECONDS for Express res.cookie()
  };
  
  // CRITICAL: Cookie domain handling for development vs production
  // For cross-domain cookies, NEVER set domain attribute (browser handles it)
  // When behind a proxy (Next.js rewrites), we MUST set domain to 'localhost' (without port)
  // Otherwise Express defaults to request host (localhost:8080), which browser rejects
  // Setting domain: 'localhost' makes cookie work for both localhost:3000 and localhost:8080
  if (isCrossDomain) {
    // Cross-domain: Don't set domain attribute - browser will use exact hostname
    // This ensures cookies work correctly for cross-domain scenarios
  } else if (process.env.COOKIE_DOMAIN) {
    // Explicit domain from env (production)
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (req && req.headers && req.headers['x-forwarded-host']) {
    // Behind a proxy - extract hostname from forwarded host and set as domain
    // This ensures cookie works for the frontend origin (localhost:3000)
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostParts = forwardedHost.split(':');
    cookieOptions.domain = hostParts[0]; // 'localhost' (without port)
  } else if (req && req.headers && req.headers.host && !isDevelopment) {
    // Production: Handle domain extraction carefully
    // CRITICAL: For Vercel and similar platforms, don't set domain attribute
    // Setting domain incorrectly causes cookies to be inaccessible
    const host = req.headers.host;
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    
    // Only set domain for true subdomains (e.g., app.example.com -> .example.com)
    // Do NOT set domain for:
    // - Vercel domains (e.g., faith-community.vercel.app)
    // - Multi-part domains (e.g., example.co.uk)
    // - Exact hostnames (let browser use exact match)
    if (hostname.includes('.') && !hostname.startsWith('localhost')) {
      const parts = hostname.split('.');
      
      // Platform domains: vercel.app, netlify.app, github.io, etc.
      const isPlatformDomain = hostname.endsWith('.vercel.app') || 
                               hostname.endsWith('.netlify.app') || 
                               hostname.endsWith('.github.io') ||
                               hostname.endsWith('.railway.app') ||
                               hostname.endsWith('.render.com');
      
      // For platform domains, don't set domain attribute (use exact hostname)
      // This ensures cookies work correctly for Vercel, Netlify, etc.
      if (!isPlatformDomain) {
        // For true subdomains (3+ parts): app.example.com -> .example.com
        if (parts.length >= 3) {
          cookieOptions.domain = '.' + parts.slice(-2).join('.');
        } 
        // For 2-part domains: example.com -> .example.com (allows subdomains)
        else if (parts.length === 2) {
          cookieOptions.domain = '.' + parts.join('.');
        }
      }
      // For platform domains, don't set domain - browser uses exact hostname match
    }
    // For exact hostname or localhost, don't set domain (uses exact host)
  } else if (isDevelopment) {
    // Development without proxy - set domain to 'localhost' to work across ports
    cookieOptions.domain = 'localhost';
  }
  // Production without explicit domain or proxy - don't set domain (uses exact host)
  
  // Final logging to verify cookie options are correct (development or cross-domain)
  if (isDevelopment || isCrossDomain) {
    console.log('[getAccessTokenCookieOptions] Final cookie options:', {
      ...cookieOptions,
      maxAge: cookieOptions.maxAge,
      maxAgeInSeconds: Math.floor(cookieOptions.maxAge / 1000),
      domain: cookieOptions.domain,
      isCrossDomain,
      origin: req?.headers?.origin,
      host: req?.headers?.host
    });
  }
  
  return cookieOptions;
}

export function getRefreshCookieOptions(req = null) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  // CRITICAL: Detect cross-domain scenarios (e.g., Vercel frontend + Railway backend)
  // For cross-domain, we MUST use SameSite=None with Secure=true
  // For same-domain, we can use SameSite=Lax (more secure)
  let sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : null; // Will be determined based on cross-domain detection
  
  // Detect if this is a cross-domain request
  const isCrossDomain = req && req.headers && req.headers.origin && req.headers.host && 
    req.headers.origin !== `https://${req.headers.host}` && 
    req.headers.origin !== `http://${req.headers.host}`;
  
  // If not explicitly set, determine based on cross-domain detection
  if (!sameSiteValue) {
    if (isCrossDomain) {
      // Cross-domain (e.g., Vercel -> Railway): MUST use None with Secure
      sameSiteValue = "none";
    } else if (isDevelopment) {
      // Development same-domain: Use Lax (works for localhost)
      sameSiteValue = "lax";
    } else {
      // Production same-domain: Use Lax (more secure)
      sameSiteValue = "lax";
    }
  }
  
  // CRITICAL: If SameSite=None, Secure MUST be true (browser requirement)
  // Override secure setting if SameSite=None is used
  const mustBeSecure = sameSiteValue === "none" || process.env.NODE_ENV === "production";
  
  // CRITICAL: Express res.cookie() maxAge is in MILLISECONDS, not seconds!
  // REFRESH_TOKEN_TTL_MS is already in milliseconds, so use it directly
  const cookieOptions = {
    httpOnly: true,
    secure: mustBeSecure, // true for production or when SameSite=None
    sameSite: sameSiteValue,
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_MS, // Already in milliseconds
  };
  
  // CRITICAL: Cookie domain handling for development vs production
  // For cross-domain cookies, NEVER set domain attribute (browser handles it)
  // When behind a proxy (Next.js rewrites), we MUST set domain to 'localhost' (without port)
  // Otherwise Express defaults to request host (localhost:8080), which browser rejects
  // Setting domain: 'localhost' makes cookie work for both localhost:3000 and localhost:8080
  if (isCrossDomain) {
    // Cross-domain: Don't set domain attribute - browser will use exact hostname
    // This ensures cookies work correctly for cross-domain scenarios
  } else if (process.env.COOKIE_DOMAIN) {
    // Explicit domain from env (production)
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  } else if (req && req.headers && req.headers['x-forwarded-host']) {
    // Behind a proxy - extract hostname from forwarded host and set as domain
    // This ensures cookie works for the frontend origin (localhost:3000)
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostParts = forwardedHost.split(':');
    cookieOptions.domain = hostParts[0]; // 'localhost' (without port)
  } else if (req && req.headers && req.headers.host && !isDevelopment) {
    // Production: Handle domain extraction carefully
    // CRITICAL: For Vercel and similar platforms, don't set domain attribute
    // Setting domain incorrectly causes cookies to be inaccessible
    const host = req.headers.host;
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    
    // Only set domain for true subdomains (e.g., app.example.com -> .example.com)
    // Do NOT set domain for:
    // - Vercel domains (e.g., faith-community.vercel.app)
    // - Multi-part domains (e.g., example.co.uk)
    // - Exact hostnames (let browser use exact match)
    if (hostname.includes('.') && !hostname.startsWith('localhost')) {
      const parts = hostname.split('.');
      
      // Platform domains: vercel.app, netlify.app, github.io, etc.
      const isPlatformDomain = hostname.endsWith('.vercel.app') || 
                               hostname.endsWith('.netlify.app') || 
                               hostname.endsWith('.github.io') ||
                               hostname.endsWith('.railway.app') ||
                               hostname.endsWith('.render.com');
      
      // For platform domains, don't set domain attribute (use exact hostname)
      // This ensures cookies work correctly for Vercel, Netlify, etc.
      if (!isPlatformDomain) {
        // For true subdomains (3+ parts): app.example.com -> .example.com
        if (parts.length >= 3) {
          cookieOptions.domain = '.' + parts.slice(-2).join('.');
        } 
        // For 2-part domains: example.com -> .example.com (allows subdomains)
        else if (parts.length === 2) {
          cookieOptions.domain = '.' + parts.join('.');
        }
      }
      // For platform domains, don't set domain - browser uses exact hostname match
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
    // Production: Handle domain extraction carefully (matches cookie setting logic)
    // CRITICAL: For Vercel and similar platforms, don't set domain attribute
    const host = req.headers.host;
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    
    // Only set domain for true subdomains (e.g., app.example.com -> .example.com)
    // Do NOT set domain for platform domains or multi-part domains
    if (hostname.includes('.') && !hostname.startsWith('localhost')) {
      const parts = hostname.split('.');
      
      // Platform domains: vercel.app, netlify.app, github.io, etc.
      const isPlatformDomain = hostname.endsWith('.vercel.app') || 
                               hostname.endsWith('.netlify.app') || 
                               hostname.endsWith('.github.io') ||
                               hostname.endsWith('.railway.app') ||
                               hostname.endsWith('.render.com');
      
      // For platform domains, don't set domain attribute (matches cookie setting logic)
      if (!isPlatformDomain) {
        // For true subdomains (3+ parts): app.example.com -> .example.com
        if (parts.length >= 3) {
          clearOptions.domain = '.' + parts.slice(-2).join('.');
        } 
        // For 2-part domains: example.com -> .example.com
        else if (parts.length === 2) {
          clearOptions.domain = '.' + parts.join('.');
        }
      }
      // For platform domains, don't set domain - matches cookie setting logic
      // For all other cases, don't set domain (matches cookie setting logic)
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


