import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

export type Announcement = {
  /** English copy. Falls back to default if blank. */
  text_en: string;
  /** Telugu copy. If blank, the storefront falls back to the English copy on the Telugu locale. */
  text_te: string;
  enabled: boolean;
};

const DEFAULT_ANNOUNCEMENT: Announcement = {
  text_en: "Visit our showroom in Cherial  ·  Free delivery on inquiries above ₹ 25,000",
  text_te: "మా చెరియాల్ షోరూమ్‌ను సందర్శించండి  ·  ₹ 25,000 పైబడిన విచారణలపై ఉచిత డెలివరీ",
  enabled: true,
};

const isConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder") &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );

export async function getAnnouncement(): Promise<Announcement> {
  if (!isConfigured()) return DEFAULT_ANNOUNCEMENT;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "announcement")
      .maybeSingle();
    if (error || !data?.value) return DEFAULT_ANNOUNCEMENT;
    const v = data.value as Partial<Announcement> & { text?: string };
    // Back-compat: an older row may have a single `text` field — promote it to `text_en`.
    const legacyText = typeof v.text === "string" ? v.text : "";
    return {
      text_en:
        typeof v.text_en === "string" && v.text_en.length > 0
          ? v.text_en
          : legacyText.length > 0
            ? legacyText
            : DEFAULT_ANNOUNCEMENT.text_en,
      text_te:
        typeof v.text_te === "string" && v.text_te.length > 0
          ? v.text_te
          : DEFAULT_ANNOUNCEMENT.text_te,
      enabled: typeof v.enabled === "boolean" ? v.enabled : DEFAULT_ANNOUNCEMENT.enabled,
    };
  } catch (err) {
    console.error("[settings] announcement read:", err);
    return DEFAULT_ANNOUNCEMENT;
  }
}

export async function setAnnouncement(input: Announcement): Promise<void> {
  if (!isConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "announcement", value: input }, { onConflict: "key" });
  if (error) throw error;
}

export { DEFAULT_ANNOUNCEMENT };

// ─────────────────────────────────────────────
// Hero rotation interval
// ─────────────────────────────────────────────

export type HeroSettings = {
  /** Seconds each banner stays visible before the next one fades in. */
  rotation_seconds: number;
};

const DEFAULT_HERO: HeroSettings = { rotation_seconds: 6 };
const HERO_MIN = 3;
const HERO_MAX = 30;

export async function getHeroSettings(): Promise<HeroSettings> {
  if (!isConfigured()) return DEFAULT_HERO;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "hero")
      .maybeSingle();
    if (error || !data?.value) return DEFAULT_HERO;
    const v = data.value as Partial<HeroSettings>;
    const raw = Number(v.rotation_seconds);
    const clamped = Number.isFinite(raw) ? Math.min(HERO_MAX, Math.max(HERO_MIN, raw)) : DEFAULT_HERO.rotation_seconds;
    return { rotation_seconds: clamped };
  } catch (err) {
    console.error("[settings] hero read:", err);
    return DEFAULT_HERO;
  }
}

export async function setHeroSettings(input: HeroSettings): Promise<void> {
  if (!isConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const clamped = Math.min(HERO_MAX, Math.max(HERO_MIN, Math.round(input.rotation_seconds)));
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "hero", value: { rotation_seconds: clamped } }, { onConflict: "key" });
  if (error) throw error;
}

export { DEFAULT_HERO, HERO_MIN, HERO_MAX };

// ─────────────────────────────────────────────
// Homepage "family shop" editorial image
// ─────────────────────────────────────────────

export type HomeEditorial = {
  image_url: string;
};

const DEFAULT_HOME_EDITORIAL: HomeEditorial = {
  image_url: "https://picsum.photos/seed/vn-shop/1200/1500",
};

export async function getHomeEditorial(): Promise<HomeEditorial> {
  if (!isConfigured()) return DEFAULT_HOME_EDITORIAL;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "home_editorial")
      .maybeSingle();
    if (error || !data?.value) return DEFAULT_HOME_EDITORIAL;
    const v = data.value as Partial<HomeEditorial>;
    return {
      image_url:
        typeof v.image_url === "string" && v.image_url.length > 0
          ? v.image_url
          : DEFAULT_HOME_EDITORIAL.image_url,
    };
  } catch (err) {
    console.error("[settings] home_editorial read:", err);
    return DEFAULT_HOME_EDITORIAL;
  }
}

export async function setHomeEditorial(input: HomeEditorial): Promise<void> {
  if (!isConfigured()) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "home_editorial", value: input }, { onConflict: "key" });
  if (error) throw error;
}

export { DEFAULT_HOME_EDITORIAL };
