import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Container builds (Dockerfile sets BUILD_STANDALONE=1) produce a self-contained
// server in .next/standalone with only the node_modules it needs. Vercel builds
// are unaffected.
const isStandalone = process.env.BUILD_STANDALONE === "1";

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
  ...(isStandalone ? { output: "standalone" as const } : {}),
  experimental: {
    optimizePackageImports: ["motion", "lucide-react"],
    // In the container the root filesystem is read-only, so regenerated ISR
    // pages are kept in memory instead of being written back into .next/.
    ...(isStandalone ? { isrFlushToDisk: false } : {}),
  },
  // Don't fail the production build (Vercel) on lint findings — lint is run
  // separately via `npm run lint`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
