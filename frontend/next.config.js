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
}

module.exports = nextConfig