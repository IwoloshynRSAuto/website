/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily ignore type errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Temporarily ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
  // For local development, we don't need HTTPS redirects
  // These will be added back for production deployment
}

module.exports = nextConfig


