import type { MetadataRoute } from "next";
import { getProducts, getCategories } from "@/lib/data";
import { site } from "@/lib/site";
import { routing } from "@/i18n/routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const base = site.url;
  const now = new Date();

  const staticPaths = ["", "/offers", "/cart", "/about", "/contact", "/terms", "/privacy"];
  const productPaths = products.map((p) => `/product/${p.slug}`);
  const categoryPaths = categories.map((c) => `/category/${c.slug}`);
  const allPaths = [...staticPaths, ...productPaths, ...categoryPaths];

  return allPaths.flatMap((path) =>
    routing.locales.map((locale) => {
      const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
      return {
        url: `${base}${prefix}${path}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: path === "" ? 1.0 : path.startsWith("/product/") ? 0.8 : 0.6,
      };
    })
  );
}
