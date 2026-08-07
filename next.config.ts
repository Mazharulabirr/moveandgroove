import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this app when another package-lock exists above it.
    root: process.cwd(),
  },
};

export default nextConfig;
