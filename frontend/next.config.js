/** @type {import('next').NextConfig} */
const nextConfig = {
  // Set the correct workspace root to avoid lockfile detection warnings
  outputFileTracingRoot: __dirname,
  
  // Image optimization
  images: {
    remotePatterns: [
      // Cloudinary patterns (always needed for production)
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      // Local development patterns (only in development)
      ...(process.env.NODE_ENV === 'development' ? [
        {
          protocol: 'http',
          hostname: 'localhost',
          port: '8080',
          pathname: '/**',
        },
        {
          protocol: 'http',
          hostname: 'localhost',
          port: '3000',
          pathname: '/**',
        },
        {
          protocol: 'http',
          hostname: 'localhost',
          port: '3001',
          pathname: '/**',
        },
        {
          protocol: 'http',
          hostname: 'localhost',
          port: '3002',
          pathname: '/**',
        },
      ] : []),
    ],
    unoptimized: process.env.NODE_ENV === 'development', // Only disable optimization in development
    dangerouslyAllowSVG: true, // Allow SVG images
  },
  
  // Enable compression for better performance
  compress: true,
  
  // Font optimization is enabled by default in Next.js
  
  // Network timeout configuration
  env: {
    NEXT_FONT_GOOGLE_MOCKED_RESPONSES: process.env.NODE_ENV === 'development' ? '1' : '0',
  },
  
  // API rewrites for development - proxy backend API to same-origin
  // This allows cookies to work with SameSite=Lax in development
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    // Only use rewrites in development when backend is on different port
    if (process.env.NODE_ENV === 'development' && backendUrl.includes('localhost:8080')) {
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    
    return [];
  },
  
  // Security headers including Content Security Policy (CSP)
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Allow inline scripts for Next.js
              "style-src 'self' 'unsafe-inline'", // Allow inline styles
              "img-src 'self' data: https: blob:", // Allow images from various sources
              "font-src 'self' data: https:",
              "connect-src 'self' https: http: ws: wss:", // Allow API calls to backend
              "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://youtube.com https://youtu.be",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig