import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { cachedQuery, CACHE_TAGS } from "@/lib/cache";
import type { CmsPage } from "@/lib/supabase/types";

export const CMS_PAGE_SLUGS = ["about", "contact", "faq", "terms", "privacy"] as const;
export type CmsPageSlug = (typeof CMS_PAGE_SLUGS)[number];

export type CmsPageInput = {
  title_en: string;
  title_te: string;
  content_en: string;
  content_te: string;
  image_url: string | null;
};

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

/** Read a CMS page row, or null if missing. */
export async function getCmsPage(slug: CmsPageSlug): Promise<CmsPage | null> {
  if (!isConfigured()) return null;
  try {
    return await cachedQuery(
      async () => {
        const supabase = createServiceClient();
        const { data, error } = await supabase
          .from("cms_pages")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (error) {
          console.error("[cms] read:", error);
          return null;
        }
        return (data as CmsPage) ?? null;
      },
      ["getCmsPage", slug],
      [CACHE_TAGS.cms],
    );
  } catch (err) {
    console.error("[cms] read exception:", err);
    return null;
  }
}

/** List all four CMS pages; rows missing in DB are returned as null entries. */
export async function listCmsPages(): Promise<{ slug: CmsPageSlug; page: CmsPage | null }[]> {
  const results = await Promise.all(
    CMS_PAGE_SLUGS.map(async (slug) => ({ slug, page: await getCmsPage(slug) }))
  );
  return results;
}

/** Upsert a CMS page row by slug. */
export async function upsertCmsPage(slug: CmsPageSlug, input: CmsPageInput): Promise<void> {
  if (!isConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("cms_pages")
    .upsert(
      {
        slug,
        title_en: input.title_en,
        title_te: input.title_te || null,
        content_en: input.content_en || null,
        content_te: input.content_te || null,
        image_url: input.image_url || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" }
    );
  if (error) throw error;
}
