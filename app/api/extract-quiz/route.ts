import { NextResponse } from "next/server";
import { chatJSON, hasOpenAI, EXTRACT_MODEL } from "@/lib/openai";
import { QUIZ_EXTRACT_SYSTEM, buildQuizExtractUser } from "@/lib/prompts";
import type { Question, QuestionType, QuestionOption, QuizKind, SurveyOutcome } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

let counter = 0;
function qid(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

const VALID_TYPES: QuestionType[] = ["multiple_choice", "true_false", "short_answer", "long_answer"];

interface OutcomeMap {
  outcomes: SurveyOutcome[];
  keyToId: Map<string, string>;
  ordered: string[]; // outcome ids in document order (for positional fallback)
}

export async function POST(req: Request) {
  try {
    const text = await readInput(req);
    if (!text || text.trim().length < 8) {
      return NextResponse.json({ kind: "quiz", title: "", outcomes: [], questions: [], source: "empty" });
    }

    if (hasOpenAI()) {
      try {
        const raw = await chatJSON<{ kind?: string; title?: string; outcomes?: unknown[]; questions?: unknown[] }>({
          model: EXTRACT_MODEL,
          system: QUIZ_EXTRACT_SYSTEM,
          user: buildQuizExtractUser(text),
          temperature: 0.2,
          maxTokens: 3500,
        });
        const kind: QuizKind = raw.kind === "survey" ? "survey" : "quiz";
        const map = buildOutcomes(raw.outcomes);
        const questions = sanitizeQuestions(raw.questions, kind, map);
        // A survey needs at least 2 outcomes to be meaningful; otherwise treat as quiz.
        const finalKind: QuizKind = kind === "survey" && map.outcomes.length >= 2 ? "survey" : "quiz";
        if (questions.length) {
          return NextResponse.json({
            kind: finalKind,
            title: String(raw.title || "").slice(0, 140) || (finalKind === "survey" ? "Untitled survey" : "Untitled quiz"),
            outcomes: finalKind === "survey" ? map.outcomes : [],
            questions,
            source: "openai",
          });
        }
      } catch {
        /* fall through to heuristic */
      }
    }

    const heuristic = heuristicQuestions(text);
    return NextResponse.json({
      kind: "quiz",
      title: heuristicTitle(text),
      outcomes: [],
      questions: heuristic,
      source: heuristic.length ? "heuristic" : "empty",
    });
  } catch {
    return NextResponse.json({ kind: "quiz", title: "", outcomes: [], questions: [], source: "error" }, { status: 200 });
  }
}

function buildOutcomes(raw: unknown): OutcomeMap {
  const keyToId = new Map<string, string>();
  const ordered: string[] = [];
  const outcomes: SurveyOutcome[] = [];
  if (Array.isArray(raw)) {
    for (const r of raw.slice(0, 8)) {
      const o = r as Record<string, unknown>;
      const label = String(o.label || "").trim().slice(0, 120);
      if (!label) continue;
      const id = qid("out");
      outcomes.push({ id, label, description: String(o.description || "").trim().slice(0, 600) });
      ordered.push(id);
      const key = String(o.key || "").trim().toLowerCase();
      if (key) keyToId.set(key, id);
    }
  }
  return { outcomes, keyToId, ordered };
}

/* --------------------------------- input ---------------------------------- */

async function readInput(req: Request): Promise<string> {
  const ctype = req.headers.get("content-type") || "";
  if (ctype.includes("application/json")) {
    const body = (await req.json()) as { text?: string };
    return body.text || "";
  }
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return (form.get("text") as string) || "";
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file.name || "").toLowerCase();
  const type = file.type || "";
  if (name.endsWith(".pdf") || type === "application/pdf") return extractPdf(buf);
  if (
    name.endsWith(".docx") ||
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocx(buf);
  }
  return buf.toString("utf8");
}

async function extractPdf(buf: Buffer): Promise<string> {
  try {
    // @ts-expect-error - no bundled types
    const mod = await import("pdf-parse/lib/pdf-parse.js");
    const pdfParse = mod.default || mod;
    const data = await pdfParse(buf);
    return data.text || "";
  } catch {
    return "";
  }
}

async function extractDocx(buf: Buffer): Promise<string> {
  try {
    const mod = (await import("mammoth")) as unknown as {
      default?: { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> };
      extractRawText?: (o: { buffer: Buffer }) => Promise<{ value: string }>;
    };
    const extractRawText = mod.default?.extractRawText ?? mod.extractRawText;
    if (!extractRawText) return "";
    const { value } = await extractRawText({ buffer: buf });
    return value || "";
  } catch {
    return "";
  }
}

/* ------------------------------- sanitize AI ------------------------------- */

function sanitizeQuestions(input: unknown, kind: QuizKind, map: OutcomeMap): Question[] {
  if (!Array.isArray(input)) return [];
  const isSurvey = kind === "survey";
  return input
    .map((raw) => {
      const o = raw as Record<string, unknown>;
      const prompt = String(o.prompt || "").trim().slice(0, 800);
      if (!prompt) return null;
      let type = String(o.type || "").trim() as QuestionType;
      if (!VALID_TYPES.includes(type)) type = "short_answer";

      const points = isSurvey ? 0 : clampPoints(o.points);
      const q: Question = { id: qid("q"), type, prompt, points };

      if (type === "multiple_choice" || type === "true_false") {
        let rawOpts: { text: string; outcomeKey: string }[] = [];
        if (type === "true_false") {
          rawOpts = [
            { text: "True", outcomeKey: "" },
            { text: "False", outcomeKey: "" },
          ];
        } else if (Array.isArray(o.options)) {
          rawOpts = (o.options as unknown[])
            .map((op) => {
              if (typeof op === "string") return { text: op, outcomeKey: "" };
              const r = op as Record<string, unknown>;
              return { text: String(r?.text || ""), outcomeKey: String(r?.outcomeKey || "") };
            })
            .filter((r) => r.text.trim())
            .slice(0, 8);
        }
        if (rawOpts.length < 2) {
          q.type = "short_answer";
        } else {
          const opts: QuestionOption[] = rawOpts.map((r, i) => {
            const opt: QuestionOption = { id: qid("o"), text: r.text.trim().slice(0, 300) };
            if (isSurvey) {
              const byKey = r.outcomeKey ? map.keyToId.get(r.outcomeKey.trim().toLowerCase()) : undefined;
              opt.outcomeId = byKey || map.ordered[i]; // positional fallback (A=0, B=1, …)
            }
            return opt;
          });
          q.options = opts;
          if (!isSurvey) {
            const match = matchOption(opts, o.correctOptionText);
            if (match) q.correctOptionId = match.id;
          }
        }
      }

      if (!isSurvey && q.type === "short_answer") {
        const ct = String(o.correctText || "").trim();
        if (ct) q.correctText = ct.slice(0, 300);
      }
      return q;
    })
    .filter((q): q is Question => !!q)
    .slice(0, 60);
}

/** Strip option-letter prefixes ("b) ", "B. ", "(c) ") and normalize for fuzzy matching. */
function normChoice(s: string): string {
  return s.trim().toLowerCase().replace(/^\(?[a-z]\)?[.):\-]\s+/i, "").replace(/\s+/g, " ").trim();
}

function matchOption(opts: QuestionOption[], rawKey: unknown): QuestionOption | undefined {
  const key = normChoice(String(rawKey || ""));
  if (!key) return undefined;
  // exact (normalized) match first, then containment either direction
  return (
    opts.find((op) => normChoice(op.text) === key) ||
    opts.find((op) => { const t = normChoice(op.text); return t && (t.includes(key) || key.includes(t)); })
  );
}

function clampPoints(p: unknown): number {
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), 100) : 1;
}

/* ----------------------------- heuristic parse ----------------------------- */

function heuristicTitle(text: string): string {
  const firstLine = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
  if (firstLine && firstLine.length <= 80 && !/^\d+[.)]/.test(firstLine)) return firstLine.slice(0, 80);
  return "Untitled quiz";
}

/**
 * No-AI fallback: treat lines that look like numbered prompts ("1.", "2)", "Q1:")
 * as short-answer questions. Conservative — better an editable skeleton than nothing.
 */
function heuristicQuestions(text: string): Question[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: Question[] = [];
  for (const line of lines) {
    const m = line.match(/^(?:q\s*)?\d+\s*[.):-]\s*(.+)$/i);
    const prompt = m ? m[1].trim() : line.endsWith("?") ? line : "";
    if (prompt && prompt.length > 3) {
      out.push({ id: qid("q"), type: "short_answer", prompt: prompt.slice(0, 800), points: 1 });
    }
    if (out.length >= 60) break;
  }
  return out;
}
