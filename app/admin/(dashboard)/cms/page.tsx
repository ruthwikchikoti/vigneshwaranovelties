import Link from "next/link";
import { listCmsPages, CMS_PAGE_SLUGS } from "@/lib/admin/cms";

export const metadata = { title: "Pages · Admin" };

const SLUG_LABELS: Record<(typeof CMS_PAGE_SLUGS)[number], { title: string; sub: string }> = {
  about: { title: "About", sub: "Our story / family showroom page" },
  contact: { title: "Contact", sub: "How to reach us, showroom address" },
  faq: { title: "FAQ", sub: "Frequently asked questions — use Q: / A: markers" },
  terms: { title: "Terms & Conditions", sub: "Legal" },
  privacy: { title: "Privacy Policy", sub: "Legal" },
};

export default async function CmsPagesIndex() {
  const pages = await listCmsPages();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="smallcaps text-[0.65rem] text-champagne-deep">Site content</p>
        <h1 className="font-display text-[2.25rem] sm:text-[2.75rem] text-ink leading-tight">
          Pages
        </h1>
        <p className="text-ink/60 text-sm mt-1 max-w-prose">
          Edit the public About, Contact, and legal pages. Type in either language —
          we&apos;ll translate to the other side when you click <em>Translate</em>.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {pages.map(({ slug, page }) => {
          const meta = SLUG_LABELS[slug];
          const lastEdited = page?.updated_at
            ? new Date(page.updated_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : null;
          return (
            <li key={slug}>
              <Link
                href={`/admin/cms/${slug}`}
                className="flex flex-col gap-2 p-5 bg-ivory border border-ink/10 hover:border-ink transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="smallcaps text-[0.55rem] text-champagne-deep">/{slug}</p>
                    <h2 className="font-display text-[1.4rem] text-ink mt-1">{meta.title}</h2>
                  </div>
                  <span
                    className={
                      page
                        ? "smallcaps text-[0.55rem] text-peacock"
                        : "smallcaps text-[0.55rem] text-ink/35"
                    }
                  >
                    {page ? "Published" : "Default content"}
                  </span>
                </div>
                <p className="text-sm text-ink/60">{meta.sub}</p>
                {lastEdited ? (
                  <p className="text-xs text-ink/40 mt-1">Last edited {lastEdited}</p>
                ) : (
                  <p className="text-xs text-ink/40 mt-1">Never edited — shows built-in copy</p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
