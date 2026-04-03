import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "50mb",
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
  redirects: async () => [
    { source: "/players", destination: "/league", permanent: true },
    { source: "/players/:path*", destination: "/league/:path*", permanent: true },
  ],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};

export default nextConfig;
