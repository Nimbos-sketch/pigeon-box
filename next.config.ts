import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  allowedDevOrigins: ["*.loca.lt", "*.trycloudflare.com"]
};

export default nextConfig;
