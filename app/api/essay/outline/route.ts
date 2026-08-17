import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, ESSAY_MODEL, EXTRACT_MODEL } from "@/lib/openai";
import type { EssayPromptSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  prompt?: Partial<EssayPromptSnapshot>;
  topic?: string;
  essayText?: string;
}

const SYSTEM = `You are a college-essay structure coach. Produce a clear beat-by-beat outline tailored to the prompt (and topic, if given).
Return STRICT JSON: {"parts":[{"label":string,"hint":string}]}.
- 4 to 6 parts, in order.
- label: 1-3 word beat name (e.g. "Hook", "Turning point").
- hint: one concrete sentence telling the student what to write in that beat FOR THEIR topic.`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const p = body.prompt || {};

  if (!hasOpenAI()) return NextResponse.json({ parts: [] });

  const user = `PROMPT: ${p.promptText || "(none)"}\n${body.topic?.trim() ? `TOPIC: ${body.topic.trim()}\n` : ""}${body.essayText?.trim() ? `\nCURRENT DRAFT:\n"""\n${body.essayText.trim().slice(0, 4000)}\n"""` : ""}`;

  for (const model of [ESSAY_MODEL, EXTRACT_MODEL]) {
    try {
      const raw = await chatJSON<{ parts?: { label?: string; hint?: string }[] }>({ model, system: SYSTEM, user, maxTokens: 700, temperature: 0.5 });
      const parts = (raw.parts ?? [])
        .filter((x) => x.label)
        .slice(0, 6)
        .map((x) => ({ label: x.label!.slice(0, 30), hint: (x.hint || "").slice(0, 160) }));
      return NextResponse.json({ parts });
    } catch {
      /* try next model */
    }
  }
  return NextResponse.json({ parts: [] });
}
