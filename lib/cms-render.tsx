import type { CmsPage } from "@/lib/supabase/types";

type Locale = "en" | "te";

/** Pick the right title for the current locale, falling back to English then to null. */
export function pickCmsTitle(page: CmsPage | null, locale: Locale): string | null {
  if (!page) return null;
  if (locale === "te" && page.title_te) return page.title_te;
  return page.title_en || null;
}

/** Pick the right body for the current locale, falling back to English then to null. */
export function pickCmsBody(page: CmsPage | null, locale: Locale): string | null {
  if (!page) return null;
  if (locale === "te" && page.content_te) return page.content_te;
  return page.content_en || null;
}

/** Render a plain-text body as paragraph JSX. Blank lines split paragraphs.
 *  Stray HTML tags from pasted content are stripped so they don't render literally. */
export function renderCmsBody(body: string) {
  return stripHtml(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => <p key={i}>{p}</p>);
}

/** Best-effort stripping of HTML tags + entities for plain-text rendering. */
function stripHtml(s: string): string {
  return s
    // Block-level tags become paragraph breaks
    .replace(/<\/?(p|br|div|li|h[1-6])\s*\/?>/gi, "\n")
    // Drop everything else
    .replace(/<[^>]+>/g, "")
    // Common HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Parse a body field that follows the Q:/A: convention into a structured list.
 *
 * Conventions:
 *   - A new question begins with a line starting with `Q:` (case-insensitive).
 *   - The answer begins with `A:` and may span multiple lines / paragraphs
 *     until the next `Q:` (or end of input).
 *   - Stray text before the first `Q:` is ignored.
 */
export function parseFaq(body: string): { question: string; answer: string }[] {
  const out: { question: string; answer: string }[] = [];
  let current: { question: string; answer: string } | null = null;
  let mode: "q" | "a" | null = null;

  const lines = body.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const qMatch = /^\s*Q\s*[:\-.)]\s*/i.exec(line);
    const aMatch = /^\s*A\s*[:\-.)]\s*/i.exec(line);
    if (qMatch) {
      if (current && (current.question || current.answer)) out.push(current);
      current = { question: line.slice(qMatch[0].length).trim(), answer: "" };
      mode = "q";
      continue;
    }
    if (aMatch) {
      if (!current) current = { question: "", answer: "" };
      current.answer = line.slice(aMatch[0].length).trim();
      mode = "a";
      continue;
    }
    if (!current) continue;
    if (mode === "q") current.question += (current.question ? " " : "") + line.trim();
    else if (mode === "a") current.answer += (current.answer ? "\n" : "") + line;
  }
  if (current && (current.question || current.answer)) out.push(current);
  return out.filter((f) => f.question || f.answer);
}
