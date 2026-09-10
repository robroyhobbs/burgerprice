import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Ensure native/pg deps are available at runtime in the standalone server
  // (Cloud Run revisions after PR #4/#5 were returning database:error).
  serverExternalPackages: ["pg"],
};

export default nextConfig;
