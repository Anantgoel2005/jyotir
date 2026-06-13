/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  // Only proxy API in development — production uses NEXT_PUBLIC_API_URL directly
  ...(process.env.NODE_ENV === "development" ? {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:9000/api/:path*",
        },
      ]
    },
  } : {}),
}

module.exports = nextConfig
