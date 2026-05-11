"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BilingualField } from "./BilingualField";
import { ImageUploader } from "./ImageUploader";
import type { CmsPage } from "@/lib/supabase/types";

type Props = {
  slug: string;
  page: CmsPage | null;
};

export function CmsPageForm({ slug, page }: Props) {
  const router = useRouter();
  const [titleEn, setTitleEn] = useState(page?.title_en ?? "");
  const [titleTe, setTitleTe] = useState(page?.title_te ?? "");
  const [contentEn, setContentEn] = useState(page?.content_en ?? "");
  const [contentTe, setContentTe] = useState(page?.content_te ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(page?.image_url ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/cms-pages/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_en: titleEn.trim(),
          title_te: titleTe.trim(),
          content_en: contentEn.trim(),
          content_te: contentTe.trim(),
          image_url: imageUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? data.error ?? "Could not save");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="bg-mist-soft/50 border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Title</h2>
        <p className="text-xs text-ink/60 mb-5">Shown as the H1 at the top of the page.</p>
        <BilingualField
          label="Title"
          enValue={titleEn}
          teValue={titleTe}
          onChangeEn={setTitleEn}
          onChangeTe={setTitleTe}
          placeholderEn="About Vigneshwara Novelties"
          placeholderTe="విగ్నేశ్వర నవల్టీస్ గురించి"
        />
      </section>

      <section className="bg-mist-soft/50 border border-ink/10 p-5 lg:p-6">
        <h2 className="font-display text-[1.2rem] text-ink mb-1">Body</h2>
        {slug === "faq" ? (
          <p className="text-xs text-ink/60 mb-5 leading-relaxed">
            Use <code className="bg-mist px-1">Q:</code> for each question and{" "}
            <code className="bg-mist px-1">A:</code> for the answer. Blank line between
            pairs.
            <br />
            <span className="text-ink/50">Example —</span>{" "}
            <code className="bg-mist px-1">Q: Do you ship across India? A: Yes…</code>
          </p>
        ) : (
          <p className="text-xs text-ink/60 mb-5">
            Plain text. Press Enter twice to start a new paragraph.
          </p>
        )}
        <BilingualField
          label="Body"
          type="textarea"
          textareaRows={12}
          enValue={contentEn}
          teValue={contentTe}
          onChangeEn={setContentEn}
          onChangeTe={setContentTe}
          placeholderEn={
            slug === "faq"
              ? "Q: Do you ship across India?\nA: Yes — we courier most pieces…\n\nQ: Can I return a piece?\nA: Unused items within 7 days…"
              : "Tell visitors about the showroom, the family, what makes the store special…"
          }
          placeholderTe={
            slug === "faq"
              ? "Q: మీరు భారతదేశం అంతటా షిప్ చేస్తారా?\nA: అవును — చాలా వస్తువులను కొరియర్ చేస్తాము…"
              : "షోరూమ్, కుటుంబం, దుకాణం గురించి విశేషాలు…"
          }
        />
      </section>

      {slug !== "faq" && (
        <section className="bg-mist-soft/50 border border-ink/10 p-5 lg:p-6">
          <h2 className="font-display text-[1.2rem] text-ink mb-1">Image (optional)</h2>
          <p className="text-xs text-ink/60 mb-5">
            Wide photo shown near the top of the public page. Leave blank to skip the image.
          </p>
          <ImageUploader
            urls={imageUrl ? [imageUrl] : []}
            onChange={(urls) => setImageUrl(urls[0] ?? null)}
            max={1}
          />
        </section>
      )}

      {error ? (
        <p className="text-sm text-vermilion border-l-2 border-vermilion pl-3 py-2 bg-vermilion-soft/40">
          {error}
        </p>
      ) : null}
      {saved && !error ? (
        <p className="text-sm text-peacock border-l-2 border-peacock pl-3 py-2 bg-peacock/5">
          Saved. Public page updates on the next visit.
        </p>
      ) : null}

      <div className="sticky bottom-[60px] lg:bottom-0 -mx-4 sm:mx-0 bg-ivory/95 backdrop-blur border-t border-ink/10 px-4 py-3 flex gap-3 z-10">
        <Button type="submit" variant="ink" disabled={submitting} fullWidth>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
