import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/auth";
import { CMS_PAGE_SLUGS, upsertCmsPage, type CmsPageSlug } from "@/lib/admin/cms";
import { revalidateCache, CACHE_TAGS } from "@/lib/cache";

export const runtime = "edge";

const schema = z.object({
  title_en: z.string().trim().min(1, "Title (English) is required").max(180),
  title_te: z.string().trim().max(180).default(""),
  content_en: z.string().trim().max(20000).default(""),
  content_te: z.string().trim().max(20000).default(""),
  image_url: z.string().url().nullable().optional().default(null),
});

const isCmsSlug = (value: string): value is CmsPageSlug =>
  (CMS_PAGE_SLUGS as readonly string[]).includes(value);

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  if (!isCmsSlug(slug)) {
    return NextResponse.json({ error: "unknown_slug" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    await upsertCmsPage(slug, parsed.data);
    revalidateCache(CACHE_TAGS.cms);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin] cms upsert:", err);
    return NextResponse.json(
      { error: "db", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
