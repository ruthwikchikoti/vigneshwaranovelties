"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Inquiry } from "@/lib/supabase/types";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { IconWhatsapp } from "@/components/ui/IconWhatsapp";
import { site } from "@/lib/site";

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

function buildPrefilledWhatsappMessage(inquiry: Inquiry) {
  const lines = [
    `Hi ${inquiry.customer_name}, this is ${site.name}.`,
    `Thank you for your inquiry — we received the following:`,
  ];
  inquiry.items.slice(0, 5).forEach((it) => {
    lines.push(`• ${it.snapshot.title} × ${it.qty}`);
  });
  if (inquiry.items.length > 5) {
    lines.push(`• …and ${inquiry.items.length - 5} more`);
  }
  lines.push("", "How can we help?");
  return encodeURIComponent(lines.join("\n"));
}

function InquiryCard({ inquiry }: { inquiry: Inquiry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Local mirror of the row so status / notes updates show up instantly,
  // even before the server-rendered list re-fetches.
  const [status, setStatus] = useState<Inquiry["status"]>(inquiry.status);
  const [statusState, setStatusState] =
    useState<"idle" | "saving" | "saved" | "error">("idle");

  const [notes, setNotes] = useState(inquiry.notes ?? "");
  const [savedNotes, setSavedNotes] = useState(inquiry.notes ?? "");
  const [noteState, setNoteState] =
    useState<"idle" | "saving" | "saved" | "error">("idle");

  const itemCount = inquiry.items.reduce((s, i) => s + i.qty, 0);
  const total = inquiry.items.reduce((s, i) => s + i.qty * i.snapshot.price, 0);
  const created = new Date(inquiry.created_at);
  const waMessage = buildPrefilledWhatsappMessage(inquiry);
  const notesDirty = notes !== savedNotes;

  const updateStatus = async (next: Inquiry["status"]) => {
    if (next === status) return;
    const prev = status;
    setStatus(next); // optimistic
    setStatusState("saving");
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatusState("saved");
      router.refresh();
      setTimeout(() => setStatusState("idle"), 1800);
    } catch (err) {
      console.error(err);
      setStatus(prev); // roll back
      setStatusState("error");
      setTimeout(() => setStatusState("idle"), 2400);
    }
  };

  const saveNotes = async () => {
    if (!notesDirty) return;
    setNoteState("saving");
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSavedNotes(notes);
      setNoteState("saved");
      router.refresh();
      setTimeout(() => setNoteState("idle"), 1800);
    } catch (err) {
      console.error(err);
      setNoteState("error");
      setTimeout(() => setNoteState("idle"), 2400);
    }
  };

  return (
    <li
      className={cn(
        "border bg-ivory transition-colors",
        status === "new"
          ? "border-champagne"
          : status === "spam"
            ? "border-vermilion/30 opacity-70"
            : "border-ink/10"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 sm:p-5 flex items-center gap-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-ink truncate">{inquiry.customer_name}</span>
            <StatusBadge status={status} />
            {statusState === "saving" && (
              <span className="text-[0.6rem] text-ink/55 inline-flex items-center gap-1">
                <Spinner /> updating
              </span>
            )}
            {statusState === "saved" && (
              <span className="text-[0.6rem] text-peacock">✓ updated</span>
            )}
            {statusState === "error" && (
              <span className="text-[0.6rem] text-vermilion">couldn&apos;t update</span>
            )}
          </div>
          <p className="text-xs text-ink/50 tabular truncate">
            {itemCount} item{itemCount > 1 ? "s" : ""} · {formatINR(total)} · {created.toLocaleDateString("en-IN")}{" "}
            {created.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`https://wa.me/91${inquiry.mobile}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 grid place-items-center bg-[#25D366] text-white rounded-sm"
            aria-label="WhatsApp"
            title="Open WhatsApp chat with a prefilled message"
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
            {inquiry.message && <Field label="Customer note" value={inquiry.message} fullSpan />}
            {inquiry.contacted_at && (
              <Field
                label="Contacted on"
                value={new Date(inquiry.contacted_at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              />
            )}
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
                  <span className="text-ink/50 tabular text-xs whitespace-nowrap">× {it.qty}</span>
                  <span className="tabular whitespace-nowrap">
                    {formatINR(it.snapshot.price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin notes — what was said on the call */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="smallcaps text-[0.55rem] text-ink/50">Your notes (private)</p>
              <NoteStatusPill state={noteState} dirty={notesDirty} />
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  void saveNotes();
                }
              }}
              rows={3}
              placeholder="What did you say on the call? When will you follow up?"
              className="w-full bg-ivory border border-ink/15 focus:border-ink py-2.5 px-3 text-ink text-sm resize-y outline-none transition-colors"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <p className="text-[0.65rem] text-ink/40">
                Saves when you click away — or press Ctrl+Enter.
              </p>
              <button
                type="button"
                disabled={!notesDirty || noteState === "saving"}
                onClick={() => void saveNotes()}
                className="smallcaps text-[0.6rem] px-3 py-1.5 bg-ink text-ivory hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save note
              </button>
            </div>
          </div>

          {/* Status update */}
          <div className="flex flex-wrap gap-2 pt-1">
            {status !== "contacted" && status !== "completed" && (
              <button
                type="button"
                disabled={statusState === "saving"}
                onClick={() => updateStatus("contacted")}
                className="smallcaps text-[0.6rem] px-3 py-2 bg-champagne text-ink hover:bg-champagne-bright disabled:opacity-40 transition-colors"
              >
                Mark contacted
              </button>
            )}
            {status !== "completed" && (
              <button
                type="button"
                disabled={statusState === "saving"}
                onClick={() => updateStatus("completed")}
                className="smallcaps text-[0.6rem] px-3 py-2 bg-ink text-ivory hover:bg-ink-soft disabled:opacity-40 transition-colors"
              >
                Mark completed
              </button>
            )}
            {status !== "new" && (
              <button
                type="button"
                disabled={statusState === "saving"}
                onClick={() => updateStatus("new")}
                className="smallcaps text-[0.6rem] px-3 py-2 border border-ink/20 text-ink hover:border-ink disabled:opacity-40 transition-colors"
              >
                Mark as new
              </button>
            )}
            {status !== "spam" ? (
              <button
                type="button"
                disabled={statusState === "saving"}
                onClick={() => updateStatus("spam")}
                className="smallcaps text-[0.6rem] px-3 py-2 border border-vermilion text-vermilion hover:bg-vermilion-soft/40 disabled:opacity-40 transition-colors ml-auto"
              >
                Spam
              </button>
            ) : (
              <span className="smallcaps text-[0.6rem] px-3 py-2 text-vermilion ml-auto">
                Marked as spam
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function NoteStatusPill({
  state,
  dirty,
}: {
  state: "idle" | "saving" | "saved" | "error";
  dirty: boolean;
}) {
  if (state === "saving") {
    return (
      <span className="text-[0.65rem] text-ink/65 inline-flex items-center gap-1.5 px-2 py-0.5 bg-mist border border-ink/10">
        <Spinner /> Saving
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="text-[0.65rem] text-peacock inline-flex items-center gap-1.5 px-2 py-0.5 bg-peacock/10 border border-peacock/30">
        ✓ Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-[0.65rem] text-vermilion inline-flex items-center gap-1.5 px-2 py-0.5 bg-vermilion-soft border border-vermilion/30">
        Couldn&apos;t save — try again
      </span>
    );
  }
  if (dirty) {
    return (
      <span className="text-[0.65rem] text-champagne-deep inline-flex items-center gap-1.5 px-2 py-0.5 bg-champagne/10 border border-champagne/40">
        Unsaved changes
      </span>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: Inquiry["status"] }) {
  const map: Record<Inquiry["status"], { label: string; cls: string }> = {
    new: { label: "NEW", cls: "bg-champagne text-ink" },
    contacted: { label: "CONTACTED", cls: "bg-ink-panel text-on-ink" },
    completed: { label: "COMPLETED", cls: "bg-peacock text-on-ink" },
    spam: { label: "SPAM", cls: "bg-vermilion text-on-ink" },
  };
  const { label, cls } = map[status];
  return (
    <span className={cn("smallcaps text-[0.5rem] px-1.5 py-0.5 tracking-[0.16em]", cls)}>
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
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
