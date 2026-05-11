"use client";

import { useRef, useState } from "react";

type Lang = "en" | "te";

type Status = "idle" | "loading" | "auto-filled" | "error";

type Params = {
  /** Current value of the English field. */
  en: string;
  /** Current value of the Telugu field. */
  te: string;
  /** Called when we want to populate the English field. */
  onSetEn: (next: string) => void;
  /** Called when we want to populate the Telugu field. */
  onSetTe: (next: string) => void;
};

type Result = {
  status: Status;
  /** Translate the English content into Telugu. No-op if EN is blank. */
  translateToTe: () => Promise<void>;
  /** Translate the Telugu content into English. No-op if TE is blank. */
  translateToEn: () => Promise<void>;
  /** True after the corresponding side was last filled by the translation API. */
  enWasAuto: boolean;
  teWasAuto: boolean;
};

/**
 * Manual translation helper for an EN/TE field pair.
 *
 * No auto-fire. The form calls `translateToTe()` or `translateToEn()` when the
 * user clicks the corresponding button — the user is in control.
 */
export function useAutoTranslate({ en, te, onSetEn, onSetTe }: Params): Result {
  const [status, setStatus] = useState<Status>("idle");
  const [enWasAuto, setEnWasAuto] = useState(false);
  const [teWasAuto, setTeWasAuto] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  const run = async (source: string, from: Lang, to: Lang) => {
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: source, from, to }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { text: string };
      if (!data.text) throw new Error("empty");
      if (to === "te") {
        onSetTe(data.text);
        setTeWasAuto(true);
        setEnWasAuto(false);
      } else {
        onSetEn(data.text);
        setEnWasAuto(true);
        setTeWasAuto(false);
      }
      setStatus("auto-filled");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
    }
  };

  const translateToTe = async () => {
    const source = en.trim();
    if (!source) return;
    await run(source, "en", "te");
  };

  const translateToEn = async () => {
    const source = te.trim();
    if (!source) return;
    await run(source, "te", "en");
  };

  return { status, translateToTe, translateToEn, enWasAuto, teWasAuto };
}
