import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const runtime = "edge";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/transient pages out of the index.
        disallow: ["/admin", "/api/", "/cart", "/inquiry/success"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
