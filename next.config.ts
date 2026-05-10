import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // Until a real CDN (ImageKit) is wired up we let the upstream serve directly.
    // Cloudflare Pages does not support Next's image optimizer anyway — production
    // uses ImageKit URL transforms via lib/imagekit.ts.
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
  poweredByHeader: false,
};

export default withNextIntl(nextConfig);
