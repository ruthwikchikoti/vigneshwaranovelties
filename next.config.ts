import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Production serves images through ImageKit URL transforms (lib/imagekit.ts),
    // so we skip Next's own optimizer — this also avoids Vercel image-optimization
    // usage on the free tier.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "wsrv.nl" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["motion", "lucide-react"],
  },
  // Don't fail the production build (Vercel) on lint findings — lint is run
  // separately via `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
