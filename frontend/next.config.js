/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  async rewrites() {
    return [
      {
        // Proxy /api/* to FastAPI backend during development
        source: "/api/:path*",
        destination: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` : "http://localhost:9000/api/:path*",
      },
    ]
  },
}

module.exports = nextConfig
