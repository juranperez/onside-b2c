import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Insights index folded into Discover (2026-06 nav refactor). Report
      // subpages (/insights/*) keep their URLs — only the index moved.
      { source: "/insights", destination: "/discover", permanent: true },
    ];
  },
};

export default nextConfig;
