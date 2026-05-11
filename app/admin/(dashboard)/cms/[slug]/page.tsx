import { notFound } from "next/navigation";
import { CmsPageForm } from "@/components/admin/CmsPageForm";
import { AdminBackLink } from "@/components/admin/AdminBackLink";
import { CMS_PAGE_SLUGS, getCmsPage, type CmsPageSlug } from "@/lib/admin/cms";
import { getDefaultFaqText, DEFAULT_FAQ_TITLE } from "@/lib/default-faq";
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
    title_en: DEFAULT_FAQ_TITLE.en,
    title_te: DEFAULT_FAQ_TITLE.te,
    content_en: getDefaultFaqText("en"),
    content_te: getDefaultFaqText("te"),
    image_url: null,
    updated_at: new Date(0).toISOString(),
  };
}

export const dynamicParams = false;

export function generateStaticParams() {
  return CMS_PAGE_SLUGS.map((slug) => ({ slug }));
}

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
  // When the editor opens for the first time, prefill from built-in defaults so
  // the owner can edit the existing questions instead of seeing a blank textarea.
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
