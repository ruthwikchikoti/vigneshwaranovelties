"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BilingualField } from "./BilingualField";

type Props = {
  initial: { text_en: string; text_te: string; enabled: boolean };
};

export function AnnouncementForm({ initial }: Props) {
  const router = useRouter();
  const [textEn, setTextEn] = useState(initial.text_en);
  const [textTe, setTextTe] = useState(initial.text_te);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/announcement", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text_en: textEn.trim(),
          text_te: textTe.trim(),
          enabled,
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <p className="text-xs text-ink/60 -mt-2">
        Type in either language — the other side fills in automatically. Keep each line under 240 characters.
      </p>

      <BilingualField
        label="Announcement text"
        type="textarea"
        textareaRows={2}
        enValue={textEn}
        teValue={textTe}
        onChangeEn={setTextEn}
        onChangeTe={setTextTe}
        placeholderEn="Visit our showroom in Cherial · Free delivery on inquiries above ₹ 25,000"
        placeholderTe="మా చెరియాల్ షోరూమ్‌ను సందర్శించండి · ₹ 25,000 పైబడిన విచారణలపై ఉచిత డెలివరీ"
      />

      <label className="inline-flex items-center gap-3 text-sm text-ink cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 accent-ink"
        />
        Show the bar on the storefront
      </label>

      {/* Live preview — shows English version. Telugu visitors see the te copy. */}
      <div>
        <p className="smallcaps text-[0.55rem] text-ink/50 mb-2">Preview (English)</p>
        {enabled && textEn.trim() ? (
          <div className="bg-ink-panel text-on-ink-2 text-[0.66rem] tracking-[0.18em] text-center py-2 px-4 font-medium uppercase rounded-[2px]">
            {textEn}
          </div>
        ) : (
          <div className="border border-dashed border-ink/20 py-3 px-4 text-center text-xs text-ink/50">
            Bar is hidden.
          </div>
        )}
      </div>
      {enabled && textTe.trim() ? (
        <div>
          <p className="smallcaps text-[0.55rem] text-ink/50 mb-2">Preview (Telugu)</p>
          <div className="bg-ink-panel text-on-ink-2 text-[0.7rem] text-center py-2 px-4 font-medium rounded-[2px]">
            {textTe}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-vermilion border-l-2 border-vermilion pl-3">{error}</p>
      ) : null}
      {saved && !error ? (
        <p className="text-sm text-peacock border-l-2 border-peacock pl-3">Saved. The bar updates on the next page load.</p>
      ) : null}

      <div>
        <Button type="submit" variant="ink" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
