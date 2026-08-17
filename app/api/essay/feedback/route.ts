import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, ESSAY_MODEL, EXTRACT_MODEL } from "@/lib/openai";
import type {
  EssayPromptSnapshot,
  EssayScore,
  EssayScoreCategory,
  EssaySuggestion,
  EssaySuggestionSeverity,
} from "@/lib/types";

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

/* Reverse-engineered from Appybara's "Analyze" pane: a strict, calibrated rubric
   that produces (1) honest category meters and (2) a prioritized list of
   quote-anchored, actionable suggestions the writer can resolve one by one. */
const SYSTEM = `You are an elite, brutally honest college-admissions essay reader (think: senior reader at a highly selective school). You do NOT inflate scores. A generic-but-clean essay is a 60, not an 85. Reserve 90+ for essays that are genuinely distinctive, specific, and moving.

SCORE EACH CATEGORY 0-100 using this band:
- 90-100 Exceptional: vivid, specific, surprising, flawless control.
- 75-89 Strong: clear voice and structure, minor soft spots.
- 60-74 Solid: competent but somewhat generic or uneven.
- 40-59 Developing: vague, cliché, or structurally muddled.
- 0-39 Weak/incomplete: off-prompt, empty, or barely started.

CATEGORY CRITERIA:
- promptFit: Does it directly and fully answer THIS prompt (and stay on it)? Penalize drift and prompt-ignoring.
- structure: Arc and flow — hook, escalation, turn, reflection, landing. Penalize list-y or aimless organization.
- clarity: Sentence-level craft, concision, grammar. Penalize wordiness, confusion, mechanical errors.
- voice: Authentic, distinctive, age-appropriate teenage voice. Penalize clichés, thesaurus-speak, and "college-essay voice".
- impact: So-what. Does it reveal character and leave the reader changed? Penalize surface-level "lesson learned" endings.

Then produce SUGGESTIONS: 4-8 specific, high-value edits, prioritized by how much they'd raise the essay. Each MUST anchor to a VERBATIM excerpt copied EXACTLY from the draft (a phrase or single sentence, 8-160 characters, from ONE paragraph — never invent or paraphrase the quote). Pick the passages that most need work. Categories to draw from: "Show, don't tell", "Cliché", "Vague / abstract", "Repetitive", "Prompt drift", "Weak opening", "Weak ending", "Telling not reflecting", "Wordiness", "Grammar / mechanics", "Pacing", "Generic insight". Assign severity by impact: high = materially hurts the essay, medium = noticeable, low = polish. When you can, include a concrete "rewrite" that improves ONLY that quoted passage in the student's own voice (else null).

Return STRICT JSON exactly:
{"overall":number,"categories":[{"key":"promptFit","label":"Prompt fit","score":number,"note":string},{"key":"structure","label":"Structure","score":number,"note":string},{"key":"clarity","label":"Clarity","score":number,"note":string},{"key":"voice","label":"Voice & authenticity","score":number,"note":string},{"key":"impact","label":"Impact","score":number,"note":string}],"strengths":[string,string,string],"improvements":[string,string,string],"suggestions":[{"category":string,"severity":"high"|"medium"|"low","quote":string,"issue":string,"fix":string,"rewrite":string|null}]}
Each note/issue/fix is ONE concrete sentence. overall is a holistic 0-100 (not the mean). If the draft is very short or empty, score low, say what's missing, and return few or no suggestions.`;

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
    suggestions: [],
    gradedAt: new Date().toISOString(),
  };
}

interface RawSuggestion {
  category?: string;
  severity?: string;
  quote?: string;
  issue?: string;
  fix?: string;
  rewrite?: string | null;
}

const SEVERITIES: EssaySuggestionSeverity[] = ["high", "medium", "low"];
const SEV_RANK: Record<EssaySuggestionSeverity, number> = { high: 0, medium: 1, low: 2 };

/** Loosely locate a quote inside the essay so hallucinated/paraphrased quotes
 *  are dropped (the editor "Jump"/"Apply" only work on real substrings). */
function locatable(quote: string, text: string): boolean {
  if (!quote) return false;
  if (text.includes(quote)) return true;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  return norm(text).includes(norm(quote));
}

function normalizeSuggestions(raw: unknown, text: string): EssaySuggestion[] {
  const list = Array.isArray(raw) ? (raw as RawSuggestion[]) : [];
  const seen = new Set<string>();
  const out: EssaySuggestion[] = [];
  for (const r of list) {
    const quote = (r.quote || "").toString().trim();
    if (!quote || quote.length < 4) continue;
    if (!locatable(quote, text)) continue; // drop fabricated/paraphrased quotes
    const key = quote.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const severity = SEVERITIES.includes(r.severity as EssaySuggestionSeverity)
      ? (r.severity as EssaySuggestionSeverity)
      : "medium";
    const rewrite = typeof r.rewrite === "string" && r.rewrite.trim() ? r.rewrite.trim().slice(0, 600) : null;
    out.push({
      id: `sg_${out.length}_${Math.random().toString(36).slice(2, 8)}`,
      category: (r.category || "Suggestion").toString().slice(0, 40),
      severity,
      quote: quote.slice(0, 400),
      issue: (r.issue || "").toString().slice(0, 240),
      fix: (r.fix || "").toString().slice(0, 240),
      rewrite,
      status: "open",
    });
    if (out.length >= 10) break;
  }
  out.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
  return out;
}

function normalize(raw: unknown, text: string): EssayScore {
  const r = (raw ?? {}) as Partial<EssayScore> & { categories?: EssayScoreCategory[]; suggestions?: unknown };
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
    suggestions: normalizeSuggestions(r.suggestions, text),
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

  const user = `PROMPT: ${p.promptText || "(none given)"}\n${p.college ? `COLLEGE: ${p.college}\n` : ""}${p.major ? `MAJOR: ${p.major}\n` : ""}${p.wordLimit ? `WORD LIMIT: ${p.wordLimit}\n` : ""}\nESSAY DRAFT:\n"""\n${text.slice(0, 8000) || "(empty)"}\n"""`;

  for (const model of [ESSAY_MODEL, EXTRACT_MODEL]) {
    try {
      const raw = await chatJSON({ model, system: SYSTEM, user, maxTokens: 2600, temperature: 0.2 });
      return NextResponse.json({ score: normalize(raw, text) });
    } catch {
      /* try next model */
    }
  }
  return NextResponse.json({ score: heuristic(text) });
}
