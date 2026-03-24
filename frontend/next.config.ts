import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.PLAYWRIGHT_DIST_DIR || ".next",
  output: "standalone",
};

export default nextConfig;
