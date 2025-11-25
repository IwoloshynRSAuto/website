/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Remove static export for development - it causes issues with dynamic routes
    // output: 'export', // Commented out for local development
    images: {
        unoptimized: true,
        domains: ['localhost', '192.168.10.70', '192.168.2.11'], // Add your local IPs
    },
    // Don't set NEXT_PUBLIC_API_URL here - let the client-side code detect it dynamically
    // This allows it to work on both localhost and network IPs
}

module.exports = nextConfig
