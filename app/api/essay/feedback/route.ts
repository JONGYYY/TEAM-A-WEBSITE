import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, ESSAY_MODEL, EXTRACT_MODEL } from "@/lib/openai";
import type { EssayPromptSnapshot, EssayScore, EssayScoreCategory } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  prompt?: Partial<EssayPromptSnapshot>;
  essayText?: string;
}

const CATEGORIES: { key: string; label: string }[] = [
  { key: "promptFit", label: "Prompt fit" },
  { key: "structure", label: "Structure" },
  { key: "clarity", label: "Clarity" },
  { key: "voice", label: "Voice & authenticity" },
  { key: "impact", label: "Impact" },
];

const SYSTEM = `You are a rigorous but encouraging college-essay reviewer. Score the essay HONESTLY on a 0-100 scale per category, and give specific, actionable notes. Do not inflate scores. Reward specificity, authentic voice, and clear structure; penalize clichés, vagueness, and prompt drift.
Return STRICT JSON exactly matching:
{"overall":number,"categories":[{"key":"promptFit","label":"Prompt fit","score":number,"note":string},{"key":"structure","label":"Structure","score":number,"note":string},{"key":"clarity","label":"Clarity","score":number,"note":string},{"key":"voice","label":"Voice & authenticity","score":number,"note":string},{"key":"impact","label":"Impact","score":number,"note":string}],"strengths":[string,string,string],"improvements":[string,string,string]}
Each note is one concrete sentence. overall is a holistic 0-100 (not necessarily the mean). If the draft is very short or empty, score low and say what's missing.`;

function heuristic(text: string): EssayScore {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const base = Math.max(10, Math.min(70, Math.round(words / 10)));
  const categories: EssayScoreCategory[] = CATEGORIES.map((c) => ({
    ...c,
    score: base,
    note: words < 40 ? "Add more of your draft to get a detailed read." : "AI review is unavailable right now — this is a rough estimate.",
  }));
  return {
    overall: base,
    categories,
    strengths: words > 40 ? ["You have a working draft to build on."] : [],
    improvements: ["Connect this feedback to specific lines once AI review is back online."],
    gradedAt: new Date().toISOString(),
  };
}

function normalize(raw: unknown, text: string): EssayScore {
  const r = (raw ?? {}) as Partial<EssayScore> & { categories?: EssayScoreCategory[] };
  const byKey = new Map((r.categories ?? []).map((c) => [c.key, c]));
  const categories: EssayScoreCategory[] = CATEGORIES.map((c) => {
    const found = byKey.get(c.key);
    return {
      key: c.key,
      label: c.label,
      score: clamp(found?.score),
      note: (found?.note || "").toString().slice(0, 240),
    };
  });
  const overall = typeof r.overall === "number" ? clamp(r.overall) : Math.round(categories.reduce((a, b) => a + b.score, 0) / categories.length);
  return {
    overall,
    categories,
    strengths: (r.strengths ?? []).filter(Boolean).slice(0, 4),
    improvements: (r.improvements ?? []).filter(Boolean).slice(0, 4),
    gradedAt: new Date().toISOString(),
  };
  function clamp(n: unknown): number {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const text = (body.essayText || "").trim();
  const p = body.prompt || {};

  if (!hasOpenAI()) return NextResponse.json({ score: heuristic(text) });

  const user = `PROMPT: ${p.promptText || "(none given)"}\n${p.college ? `COLLEGE: ${p.college}\n` : ""}${p.wordLimit ? `WORD LIMIT: ${p.wordLimit}\n` : ""}\nESSAY DRAFT:\n"""\n${text.slice(0, 8000) || "(empty)"}\n"""`;

  for (const model of [ESSAY_MODEL, EXTRACT_MODEL]) {
    try {
      const raw = await chatJSON({ model, system: SYSTEM, user, maxTokens: 1500, temperature: 0.2 });
      return NextResponse.json({ score: normalize(raw, text) });
    } catch {
      /* try next model */
    }
  }
  return NextResponse.json({ score: heuristic(text) });
}
