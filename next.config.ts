import type { NextConfig } from "next";
import packageJson from "./package.json";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
