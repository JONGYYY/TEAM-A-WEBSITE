import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, ESSAY_MODEL, EXTRACT_MODEL } from "@/lib/openai";
import type { EssayPromptSnapshot } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  prompt?: Partial<EssayPromptSnapshot>;
  selection?: string;
  essayText?: string;
}

const SYSTEM = `You are a college-essay line editor. The student highlighted a passage and wants it stronger.
Preserve THEIR voice and meaning — do not invent facts or replace their story. Improve specificity, rhythm, and clarity; cut clichés and filler.
Return STRICT JSON: {"rationale":string,"suggestions":[string,string]}.
- rationale: one or two sentences on what's weak and how to fix it.
- suggestions: 1-2 rewrites of ONLY the highlighted passage (not the whole essay), each a drop-in replacement of similar length.`;

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const selection = (body.selection || "").trim();
  if (!selection) return NextResponse.json({ error: "No text selected." }, { status: 400 });
  const p = body.prompt || {};

  if (!hasOpenAI()) {
    return NextResponse.json({
      rationale: "AI suggestions are unavailable right now. Try making the passage more specific — swap general statements for a concrete moment or detail.",
      suggestions: [],
    });
  }

  const context = (body.essayText || "").trim().slice(0, 4000);
  const user = `PROMPT: ${p.promptText || "(none)"}\n\nFULL DRAFT (for context):\n"""\n${context || "(empty)"}\n"""\n\nHIGHLIGHTED PASSAGE TO IMPROVE:\n"""\n${selection.slice(0, 1500)}\n"""`;

  for (const model of [ESSAY_MODEL, EXTRACT_MODEL]) {
    try {
      const raw = await chatJSON<{ rationale?: string; suggestions?: string[] }>({ model, system: SYSTEM, user, maxTokens: 900, temperature: 0.5 });
      return NextResponse.json({
        rationale: (raw.rationale || "").toString().slice(0, 400),
        suggestions: (raw.suggestions ?? []).filter(Boolean).slice(0, 2),
      });
    } catch {
      /* try next model */
    }
  }
  return NextResponse.json({ rationale: "Couldn't generate a suggestion just now. Please try again.", suggestions: [] });
}
