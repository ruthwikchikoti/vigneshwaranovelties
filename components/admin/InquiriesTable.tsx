"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Inquiry } from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";

type Props = { inquiries: Inquiry[] };

const FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Completed", value: "completed" },
];

export function InquiriesTable({ inquiries }: Props) {
  const [filter, setFilter] = useState("");
  const list = filter ? inquiries.filter((i) => i.status === filter) : inquiries;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hidden -mx-4 px-4 sm:mx-0 sm:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "smallcaps text-[0.6rem] px-3 py-1.5 border whitespace-nowrap transition-colors",
              filter === f.value
                ? "bg-ink text-ivory border-ink"
                : "bg-ivory text-ink border-ink/15 hover:border-ink"
            )}
          >
            {f.label}
            {f.value
              ? ` · ${inquiries.filter((i) => i.status === f.value).length}`
              : ` · ${inquiries.length}`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="border border-dashed border-ink/15 p-12 text-center text-sm text-ink/50">
          No inquiries yet. They appear here as customers submit them on the site.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((inq) => (
            <InquiryCard key={inq.id} inquiry={inq} />
          ))}
        </ul>
      )}
    </div>
  );
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const itemCount = inquiry.items.reduce((s, i) => s + i.qty, 0);
  const total = inquiry.items.reduce((s, i) => s + i.qty * i.snapshot.price, 0);
  const created = new Date(inquiry.created_at);

  const updateStatus = (status: Inquiry["status"]) => {
    startTransition(async () => {
      try {
        await fetch(`/api/admin/inquiries/${inquiry.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch (err) {
        console.error(err);
      }
    });
  };

  return (
    <li
      className={cn(
        "border bg-ivory transition-colors",
        inquiry.status === "new" ? "border-champagne" : "border-ink/10"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 sm:p-5 flex items-center gap-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-ink truncate">{inquiry.customer_name}</span>
            {inquiry.status === "new" && (
              <span className="smallcaps text-[0.5rem] px-1.5 py-0.5 bg-champagne text-ink">NEW</span>
            )}
          </div>
          <p className="text-xs text-ink/50 tabular truncate">
            {itemCount} item{itemCount > 1 ? "s" : ""} · {formatINR(total)} · {created.toLocaleDateString("en-IN")}{" "}
            {created.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`https://wa.me/91${inquiry.mobile}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 grid place-items-center bg-[#25D366] text-white rounded-sm"
            aria-label="WhatsApp"
          >
            <IconWhatsapp size={16} />
          </a>
          <a
            href={`tel:+91${inquiry.mobile}`}
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 grid place-items-center bg-ink text-ivory rounded-sm"
            aria-label="Call"
          >
            <CallIcon />
          </a>
        </div>
      </button>

      {open && (
        <div className="border-t border-ink/10 p-4 sm:p-5 bg-mist-soft/50 flex flex-col gap-4">
          {/* Customer */}
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field label="Mobile" value={`+91 ${inquiry.mobile}`} mono />
            {inquiry.address && <Field label="Address" value={inquiry.address} />}
            {inquiry.message && <Field label="Notes" value={inquiry.message} fullSpan />}
          </div>

          {/* Items */}
          <div>
            <p className="smallcaps text-[0.55rem] text-ink/50 mb-2">Items</p>
            <ul className="bg-ivory border border-ink/10 divide-y divide-ink/5">
              {inquiry.items.map((it, idx) => (
                <li key={idx} className="p-3 flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/product/${it.snapshot.slug}`}
                    target="_blank"
                    className="font-medium hover:text-champagne-deep transition-colors truncate flex-1"
                  >
                    {it.snapshot.title}
                  </Link>
                  <span className="text-ink/50 tabular text-xs whitespace-nowrap">
                    × {it.qty}
                  </span>
                  <span className="tabular whitespace-nowrap">
                    {formatINR(it.snapshot.price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Status update */}
          <div className="flex flex-wrap gap-2">
            {inquiry.status !== "contacted" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => updateStatus("contacted")}
                className="smallcaps text-[0.6rem] px-3 py-2 bg-champagne text-ink hover:bg-champagne-bright transition-colors"
              >
                Mark contacted
              </button>
            )}
            {inquiry.status !== "completed" && (
              <button
                type="button"
                disabled={pending}
                onClick={() => updateStatus("completed")}
                className="smallcaps text-[0.6rem] px-3 py-2 bg-ink text-ivory hover:bg-ink-soft transition-colors"
              >
                Mark completed
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => updateStatus("spam")}
              className="smallcaps text-[0.6rem] px-3 py-2 border border-cognac text-cognac hover:bg-cognac/5 transition-colors ml-auto"
            >
              Spam
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Field({ label, value, mono, fullSpan }: { label: string; value: string; mono?: boolean; fullSpan?: boolean }) {
  return (
    <div className={fullSpan ? "sm:col-span-2" : undefined}>
      <p className="smallcaps text-[0.55rem] text-ink/50 mb-0.5">{label}</p>
      <p className={cn("text-ink", mono && "tabular")}>{value}</p>
    </div>
  );
}

function CallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
