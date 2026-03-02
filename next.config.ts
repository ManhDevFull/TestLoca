import withPWAInit from "@ducanh2912/next-pwa";
import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development" || isCapacitorBuild,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isCapacitorBuild ? "export" : undefined,
  images: isCapacitorBuild ? { unoptimized: true } : undefined,
  trailingSlash: isCapacitorBuild,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), bluetooth=(self), camera=(), microphone=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
