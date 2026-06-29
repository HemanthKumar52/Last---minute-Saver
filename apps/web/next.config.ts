import type { NextConfig } from "next";

const config: NextConfig = {
  // Shared workspace packages ship raw TS — let Next transpile them.
  transpilePackages: ["@clutch/tokens", "@clutch/core"],
  reactStrictMode: true,
};

export default config;
