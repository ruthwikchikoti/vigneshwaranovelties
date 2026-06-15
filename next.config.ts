import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Images are resized + served by ImageKit through a custom loader
    // (lib/imagekit-loader.ts). A custom loader keeps next/image's responsive
    // srcset working — so phones download phone-sized images instead of the one
    // hardcoded width — WITHOUT ever hitting Vercel's optimizer, so we stay on
    // the free tier. This replaces the old `unoptimized: true`, which had
    // silently disabled srcset generation entirely (the cause of slow images).
    loaderFile: "./lib/imagekit-loader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "wsrv.nl" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
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
