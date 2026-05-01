import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // `standalone` produces a self-contained server bundle at .next/standalone
  // that the production Docker image runs directly. Required for the small
  // multi-stage image used by Railway.
  output: "standalone",

  // Tell Next where the monorepo root is so it traces our workspace
  // packages (`@roboticlawnz/shared-types`, `@roboticlawnz/ui`) into the
  // standalone bundle.
  outputFileTracingRoot: path.join(__dirname, "../../"),

  // Workspace packages aren't pre-built — Next must transpile them.
  transpilePackages: ["@roboticlawnz/ui", "@roboticlawnz/shared-types"],

  experimental: {
    typedRoutes: true,
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "images.roboticlawnz.com" },
      { protocol: "https", hostname: "*.roboticlawnz.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
