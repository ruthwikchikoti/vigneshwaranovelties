import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/auth";
import { translate } from "@/lib/translate";

export const runtime = "nodejs";

const schema = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(["en", "te"]),
  to: z.enum(["en", "te"]),
});

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 422 });
  }

  try {
    const result = await translate(parsed.data.text, parsed.data.from, parsed.data.to);
    return NextResponse.json({ text: result.text, provider: result.provider });
  } catch (err) {
    console.error("[admin] translate:", err);
    return NextResponse.json(
      { error: "upstream", message: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
