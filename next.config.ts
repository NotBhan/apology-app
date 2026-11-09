import type { NextConfig } from "next";
import path from "node:path";
import { buildSecurityHeaders } from "./src/lib/security/headers";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // This application is fully request-time personalized (private tokens, drafts,
  // recipient sessions). Cache Components' static-shell requirement only adds
  // friction here, so it is disabled deliberately. See docs/ARCHITECTURE.md.
  cacheComponents: false,
  // Pin the workspace root: a lockfile in $HOME otherwise confuses Turbopack.
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  /**
   * Applied to every response, including API routes, 404s and error pages.
   * The policy is built in `src/lib/security/headers.ts` so it can be tested.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({
          production: isProduction,
          // Pre-signed media is fetched from the storage origin, so the CSP
          // allows exactly that host for images and audio.
          storageOrigin: process.env.FILEBASE_ENDPOINT,
        }),
      },
    ];
  },
};

export default nextConfig;
