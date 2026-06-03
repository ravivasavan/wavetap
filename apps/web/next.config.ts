import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the monorepo root so file tracing is correct (avoids picking up a
  // stray lockfile elsewhere on the machine, and is correct on Vercel).
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Compile the workspace packages from source.
  transpilePackages: ["@wavetap/tokens", "@wavetap/core", "@wavetap/api"],
};

export default nextConfig;
