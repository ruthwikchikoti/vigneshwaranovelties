import { notFound } from "next/navigation";
import { CmsPageForm } from "@/components/admin/CmsPageForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { CMS_PAGE_SLUGS, getCmsPage, type CmsPageSlug } from "@/lib/admin/cms";
import type { CmsPage } from "@/lib/supabase/types";

const SLUG_TITLES: Record<CmsPageSlug, string> = {
  about: "About",
  contact: "Contact",
  faq: "FAQ",
  terms: "Terms & Conditions",
  privacy: "Privacy Policy",
};

const isCmsSlug = (value: string): value is CmsPageSlug =>
  (CMS_PAGE_SLUGS as readonly string[]).includes(value);

function buildDefaultFaqDraft(): CmsPage {
  return {
    id: "_draft",
    slug: "faq",
    title_en: "",
    title_te: "",
    content_en: "",
    content_te: "",
    image_url: null,
    updated_at: new Date(0).toISOString(),
  };
}

// Edge runtime (inherited from the admin layout) disallows generateStaticParams.
// Slug validation below handles unknown values with notFound().

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isCmsSlug(slug)) return {};
  return { title: `${SLUG_TITLES[slug]} · Admin` };
}

export default async function EditCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isCmsSlug(slug)) notFound();

  const dbRow = await getCmsPage(slug);
  const page: CmsPage | null =
    dbRow ?? (slug === "faq" ? buildDefaultFaqDraft() : null);
  const label = SLUG_TITLES[slug];

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <AdminBackLink href="/admin/cms" label="All pages" />
        <p className="smallcaps text-[0.65rem] text-champagne-deep mt-4">/{slug}</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          {label}
        </h1>
        <p className="text-ink/60 text-sm mt-1 max-w-prose">
          What you save here replaces the public <code className="bg-mist px-1">/{slug}</code> page.
          Type in English or Telugu — click <em>Translate</em> on the other field to auto-fill it.
        </p>
      </div>

      <CmsPageForm slug={slug} page={page} />
    </div>
  );
}
