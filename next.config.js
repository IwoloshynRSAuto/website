/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily ignore type errors during production builds
    ignoreBuildErrors: true,
  },
  // Production: React strict mode enabled for better development practices
  // Development: Can be disabled in local .env.development or next.config.local.js
  reactStrictMode: process.env.NODE_ENV === 'production',
}

module.exports = nextConfig


