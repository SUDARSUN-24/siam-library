import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is opt-in in Next 16. Every page here depends on the request
  // (language cookie, live borrowed/available status), so we render dynamically.
  cacheComponents: false,
  partialPrefetching: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
