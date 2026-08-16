import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No serverExternalPackages needed – libsql is WASM, no native modules
  output: "standalone",
  // API routes use a prebuilt SQLite catalog. Make Next's output tracing include
  // it explicitly so Vercel functions can copy it to /tmp on cold start.
  outputFileTracingIncludes: {
    "/*": ["./data/assets.db"],
  },
};

export default nextConfig;
