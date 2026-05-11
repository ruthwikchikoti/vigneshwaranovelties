"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ImageUploader } from "./ImageUploader";

type Props = {
  initial: { image_url: string };
};

export function HomeEditorialForm({ initial }: Props) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(initial.image_url || null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = imageUrl !== initial.image_url;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      setError("Please upload an image first.");
      return;
    }
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/home-editorial", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? data.error ?? "Could not save");
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ImageUploader
        urls={imageUrl ? [imageUrl] : []}
        onChange={(urls) => setImageUrl(urls[0] ?? null)}
        max={1}
      />

      {error ? (
        <p className="text-sm text-vermilion border-l-2 border-vermilion pl-3">{error}</p>
      ) : null}
      {saved && !error ? (
        <p className="text-sm text-peacock border-l-2 border-peacock pl-3">
          Saved. Refresh the homepage to see the new image.
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="ink" disabled={submitting || !dirty}>
          {submitting ? "Saving…" : "Save image"}
        </Button>
      </div>
    </form>
  );
}
