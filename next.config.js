/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily ignore type errors during production builds
    ignoreBuildErrors: true,
  },
  // Production: React strict mode enabled for better development practices
  // Development: Can be disabled in local .env.development or next.config.local.js
  reactStrictMode: process.env.NODE_ENV === 'production',
  // Turbopack config (empty to allow webpack config)
  turbopack: {},
  // Webpack config to handle optional dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore optional dependencies that may not be installed
      // This prevents webpack from trying to bundle them
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@aws-sdk/client-s3': false,
        '@aws-sdk/s3-request-presigner': false,
        'pdfkit': false,
      }
      // Mark these as external to prevent bundling
      config.externals = config.externals || []
      if (Array.isArray(config.externals)) {
        config.externals.push('@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'pdfkit')
      } else if (typeof config.externals === 'object') {
        config.externals['@aws-sdk/client-s3'] = false
        config.externals['@aws-sdk/s3-request-presigner'] = false
        config.externals['pdfkit'] = false
      }
    }
    return config
  },
}

module.exports = nextConfig


