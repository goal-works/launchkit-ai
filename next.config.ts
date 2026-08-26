import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { useTypeScriptCli: false },
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
};

export default nextConfig;
