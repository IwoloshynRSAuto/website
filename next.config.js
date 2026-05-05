/** @type {import('next').NextConfig} */
const NO_STORE_DOCUMENT = [
  {
    key: 'Cache-Control',
    value: 'private, no-cache, no-store, max-age=0, must-revalidate',
  },
]

const nextConfig = {
/**
 * 1) Long-lived cache for hashed webpack chunks (safe: filename changes each build).
 * 2) No-store for HTML-like routes so users never keep a shell that references deleted chunks.
 *
 * If styles/scripts fail site-wide (ChunkLoadError on `/_next/static`), do a clean deploy
 * (`npm run deploy:prod:clean`) and confirm `/api/build-health` returns ok; the reverse proxy
 * must serve `/_next/static` from the same build as the Node process.
 */
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/((?!_next/static|_next/image|favicon.ico).*)',
        headers: NO_STORE_DOCUMENT,
      },
    ]
  },
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


