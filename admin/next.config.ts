import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The admin reads the app's colour tokens (../app/src/theme/tokens.ts),
  // so the repo root is the build root.
  turbopack: { root: path.join(__dirname, "..") },
};

export default nextConfig;
