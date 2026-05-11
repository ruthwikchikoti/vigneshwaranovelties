"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type Props = {
  initial: { rotation_seconds: number };
  min: number;
  max: number;
};

export function HeroSettingsForm({ initial, min, max }: Props) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(initial.rotation_seconds);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rotation_seconds: seconds }),
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

  const onChange = (next: number) => {
    if (Number.isNaN(next)) return;
    setSeconds(Math.min(max, Math.max(min, Math.round(next))));
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="hero-seconds" className="text-sm text-ink">
          Show each banner for
        </label>
        <input
          id="hero-seconds"
          type="number"
          min={min}
          max={max}
          step={1}
          value={seconds}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 bg-ivory border border-ink/15 focus:border-ink py-2 px-3 text-ink text-sm outline-none transition-colors tabular text-right"
          inputMode="numeric"
        />
        <span className="text-sm text-ink">seconds, then rotate.</span>
      </div>
      <p className="text-xs text-ink/55">
        Allowed range: {min}–{max} seconds. Default is 6.
      </p>

      {error ? (
        <p className="text-sm text-vermilion border-l-2 border-vermilion pl-3">{error}</p>
      ) : null}
      {saved && !error ? (
        <p className="text-sm text-peacock border-l-2 border-peacock pl-3">
          Saved. Refresh the storefront to see the new timing.
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="ink" disabled={submitting}>
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
