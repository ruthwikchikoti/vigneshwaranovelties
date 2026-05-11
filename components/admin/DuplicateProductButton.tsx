"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  productId: string;
};

export function DuplicateProductButton({ productId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doDuplicate = async () => {
    setConfirming(false);
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/duplicate`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? data.error ?? "Could not duplicate");
      }
      const data = (await res.json()) as { id: string };
      router.push(`/admin/products/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate");
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="smallcaps text-[0.6rem] px-3 py-2 border border-ink/15 hover:border-ink text-ink disabled:opacity-50"
      >
        {pending ? "Duplicating…" : "Duplicate"}
      </button>
      {error ? (
        <p className="text-xs text-vermilion mt-2">{error}</p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        title="Create a copy of this product?"
        description="A new product is created as inactive — you can publish it once you finish editing."
        confirmLabel="Create copy"
        variant="neutral"
        busy={pending}
        onCancel={() => setConfirming(false)}
        onConfirm={doDuplicate}
      />
    </>
  );
}
