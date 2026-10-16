import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the dev badge off the sidebar footer
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
