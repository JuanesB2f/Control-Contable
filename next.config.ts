import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  // Only product photos from this project's public bucket go through the image optimizer.
  images: {
    remotePatterns: supabaseUrl ? [new URL("/storage/v1/object/public/product-images/**", supabaseUrl)] : [],
  },
  // Minimal self-contained server for the Docker image; Vercel ignores it and uses its own output.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // Server Action arguments include passwords and invitation tokens; keep them out of dev logs.
  logging: {
    serverFunctions: false,
  },
  // The service worker must always be revalidated so updates reach installed apps.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
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
