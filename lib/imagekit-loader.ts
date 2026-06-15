/**
 * Custom next/image loader (wired up via `images.loaderFile` in next.config.ts).
 *
 * Why this exists: we previously set `images.unoptimized = true`, which made
 * next/image emit a single <img> with NO srcset — so the `sizes` prop was
 * ignored and every device downloaded the one hardcoded width (a phone pulling
 * an 800px product card, etc.). That was the main reason images felt slow.
 *
 * With a custom loader, next/image generates a real responsive srcset (one URL
 * per device width) and asks ImageKit to resize each variant on the fly. Because
 * the URLs point straight at ImageKit, Next never routes through Vercel's image
 * optimizer — so this stays free on the Vercel free tier, just like before.
 *
 * The `src` it receives has usually already been through `ikImage()` (so it's an
 * ImageKit URL carrying `?tr=f-auto,q-85,…`). We keep that format/quality intent
 * and only OVERRIDE the width per srcset entry. Non-ImageKit URLs (local assets,
 * placeholders, picsum, or dev with ImageKit unconfigured) pass through untouched.
 */
const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL;

type LoaderArgs = { src: string; width: number; quality?: number };

export default function imageKitLoader({ src, width, quality }: LoaderArgs): string {
  if (
    !src ||
    !IMAGEKIT_URL ||
    IMAGEKIT_URL.includes("placeholder") ||
    !src.startsWith(IMAGEKIT_URL)
  ) {
    return src;
  }

  const [base, query = ""] = src.split("?");

  // Split the query into ImageKit transform tokens (tr=…) and everything else
  // (e.g. a ?v= cache-bust token), preserving literal commas inside `tr`.
  const trMap = new Map<string, string>();
  const otherParams: string[] = [];
  for (const pair of query.split("&")) {
    if (!pair) continue;
    if (pair.startsWith("tr=")) {
      for (const token of pair.slice(3).split(",")) {
        if (token) trMap.set(token.split("-")[0], token);
      }
    } else {
      otherParams.push(pair);
    }
  }

  // next/image picks the width per device — that always wins.
  trMap.set("w", `w-${width}`);
  if (!trMap.has("f")) trMap.set("f", "f-auto");
  if (quality && !trMap.has("q")) trMap.set("q", `q-${quality}`);

  const qs = [`tr=${Array.from(trMap.values()).join(",")}`, ...otherParams].join("&");
  return `${base}?${qs}`;
}
