// Helper to extract real client IP address called handling proxies
export const getClientIpAddress = (req) => {
  // Check X-Forwarded-For header (for proxies/load balancers)
  // Take the first IP if multiple (closest to client)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Return the first one (original client IP)
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // Check X-Real-IP header (some proxies use this)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp.trim();
  }

  // Fallback to Express's req.ip (requires trust proxy to be set)
  if (req.ip) {
    return req.ip;
  }

  // Last resort: connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
};

