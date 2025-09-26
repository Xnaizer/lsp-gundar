/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features if needed
  experimental: {
    // serverActions: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  
  // Redirects (optional)
  async redirects() {
    return [
      // Add any redirects if needed
    ];
  },
};

module.exports = nextConfig;