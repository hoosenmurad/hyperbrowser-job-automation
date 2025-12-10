import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Allow server-side file operations
  serverExternalPackages: ["pino"],
};

export default nextConfig;

