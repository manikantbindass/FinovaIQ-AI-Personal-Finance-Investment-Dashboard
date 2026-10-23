import type { NextConfig } from "next";
import { apiProxyOrigin } from "./src/lib/deployment";
const upstream = apiProxyOrigin({
  VERCEL: process.env.VERCEL,
  API_PROXY_URL: process.env.API_PROXY_URL,
});
const config: NextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${upstream}/api/v1/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
