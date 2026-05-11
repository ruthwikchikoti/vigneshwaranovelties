import "server-only";

/**
 * Translation backend.
 *
 * Default: MyMemory — free, no API key. ~5K requests/day per IP (10K with email
 * via `de` query param). Quality is acceptable for short product titles and
 * descriptions in te ↔ en.
 *
 * To upgrade to Google Cloud Translation later, add a `GOOGLE_TRANSLATE_API_KEY`
 * env var and add a branch below — the public translate() signature stays the same.
 */

export type Lang = "en" | "te";

export type TranslateResult = {
  text: string;
  provider: "mymemory" | "passthrough";
};

const MAX_INPUT = 1000;

export async function translate(
  input: string,
  from: Lang,
  to: Lang
): Promise<TranslateResult> {
  const trimmed = input.trim();
  if (!trimmed) return { text: "", provider: "passthrough" };
  if (from === to) return { text: trimmed, provider: "passthrough" };

  // MyMemory caps free queries at ~500 chars; clip with an ellipsis so the
  // request still succeeds and the editor sees a partial translation it can extend.
  const payload = trimmed.length > MAX_INPUT ? trimmed.slice(0, MAX_INPUT) : trimmed;

  const params = new URLSearchParams({
    q: payload,
    langpair: `${from}|${to}`,
  });
  // The `de` param raises the per-day quota from 5K to 10K — harmless to send.
  const contactEmail = process.env.MYMEMORY_CONTACT_EMAIL;
  if (contactEmail) params.set("de", contactEmail);

  const url = `https://api.mymemory.translated.net/get?${params.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    // Don't cache — translations are inputs from a free-text field.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Translation API returned ${res.status}`);
  }
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
  };
  const text = data.responseData?.translatedText;
  if (!text || data.responseStatus !== 200) {
    throw new Error("Translation API returned no result");
  }
  return { text, provider: "mymemory" };
}

/** Detect script of a string — Telugu Unicode block is U+0C00–U+0C7F. */
export function detectLang(input: string): Lang {
  return /[ఀ-౿]/.test(input) ? "te" : "en";
}
