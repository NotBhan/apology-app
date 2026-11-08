import type { NextConfig } from "next";
import path from "node:path";

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
};

export default nextConfig;
