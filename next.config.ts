import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No serverExternalPackages needed – libsql is WASM, no native modules
};

export default nextConfig;