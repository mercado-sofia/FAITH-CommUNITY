/**
 * Shared cookie utility functions
 * Handles cross-domain detection and SameSite policy determination
 */

export function getCookieSameSite(req = null) {
  const isDevelopment = process.env.NODE_ENV !== "production";
  
  // Check if explicitly set in environment
  let sameSiteValue = process.env.COOKIE_SAMESITE 
    ? (process.env.COOKIE_SAMESITE).toLowerCase()
    : null;
  
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
  
  return sameSiteValue;
}

export function getCookieSecure(req = null) {
  const sameSiteValue = getCookieSameSite(req);
  // If SameSite=None, Secure MUST be true (browser requirement)
  // Also secure in production
  return sameSiteValue === "none" || process.env.NODE_ENV === "production";
}

