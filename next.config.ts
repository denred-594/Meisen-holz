import type { NextConfig } from "next";

const ignoreBuildChecks = process.env.NEXT_IGNORE_TYPE_ERRORS === "1";

const nextConfig: NextConfig = {
  experimental: { optimizePackageImports: ["@mantine/core", "@mantine/hooks"] },
  redirects: () => [{ source: "/", destination: "/kisten", permanent: true }],
  typescript: { ignoreBuildErrors: ignoreBuildChecks },
};

export default nextConfig;
