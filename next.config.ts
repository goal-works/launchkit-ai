import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_STANDALONE === "true"
    ? { output: "standalone" as const }
    : {}),
  experimental: { useTypeScriptCli: false },
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
};

export default nextConfig;
