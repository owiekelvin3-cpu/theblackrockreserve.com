/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "financialmodelingprep.com",
        pathname: "/image-stock/**",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons",
      },
    ],
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "react-icons",
      "sonner",
      "@hookform/resolvers",
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    const staticCache = [
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/favicon.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      ...staticCache,
    ];
  },
};

export default nextConfig;
