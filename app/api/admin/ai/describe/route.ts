import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { describeSchema } from "@/lib/validations/ai";
import { aiConfigured } from "@/lib/ai/config";
import { describeImages } from "@/lib/ai/describe";
import { translate } from "@/lib/translate";

// Node.js runtime (NOT edge): the Bedrock call ships base64 image bytes and can
// take a few seconds. maxDuration gives it headroom on Vercel serverless.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Draft a product description from the just-uploaded photo(s) so the owner can
 * review/edit it before saving. English comes from Bedrock (Nova Lite); Telugu
 * from the existing free MyMemory translator. Nothing is persisted here — the
 * client drops the text into the form fields, and saving the product is the
 * approval step.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = describeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation" }, { status: 422 });

  // No Bedrock creds → tell the client so it quietly falls back to manual entry
  // (same "demo mode" contract as the AI image pipeline). Never an error toast.
  if (!aiConfigured()) {
    return NextResponse.json({ ok: false, configured: false });
  }

  try {
    const { images, title, category, tags } = parsed.data;
    const draft = await describeImages({ imageUrls: images, title, category, tags });

    // Telugu via MyMemory (free, no key). Best-effort per field: if a call fails,
    // the owner still gets the English draft and can translate manually with the
    // existing per-field "Translate from English" button.
    const toTe = async (text: string): Promise<string> => {
      if (!text) return "";
      try {
        return (await translate(text, "en", "te")).text;
      } catch (err) {
        console.warn("[ai/describe] telugu translate failed:", err);
        return "";
      }
    };
    const [description_te, title_te] = await Promise.all([
      toTe(draft.description),
      toTe(draft.title),
    ]);

    return NextResponse.json({
      ok: true,
      configured: true,
      title_en: draft.title,
      title_te,
      description_en: draft.description,
      description_te,
      tags: draft.tags,
    });
  } catch (err) {
    console.error("[ai/describe]", err);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
