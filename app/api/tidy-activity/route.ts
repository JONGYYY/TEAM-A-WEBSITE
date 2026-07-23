import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, EXTRACT_MODEL } from "@/lib/openai";
import { ACTIVITY_TIDY_SYSTEM, buildActivityTidyUser } from "@/lib/prompts";
import { tidyText } from "@/lib/autofill";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = String(body.text || "");
  } catch {
    /* ignore */
  }

  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return NextResponse.json({ description: "", source: "empty" });
  if (clean.length <= 150) return NextResponse.json({ description: clean, source: "noop" });

  if (hasOpenAI()) {
    try {
      const raw = await chatJSON<{ description?: string }>({
        model: EXTRACT_MODEL,
        system: ACTIVITY_TIDY_SYSTEM,
        user: buildActivityTidyUser(clean),
        temperature: 0.3,
        maxTokens: 300,
      });
      let out = String(raw.description || "").replace(/\s+/g, " ").trim();
      // Guarantee the length contract even if the model overshoots.
      if (out.length > 150) out = tidyText(out, 150);
      if (out) return NextResponse.json({ description: out, source: "openai" });
    } catch {
      /* fall through */
    }
  }

  return NextResponse.json({ description: tidyText(clean, 150), source: "heuristic" });
}
