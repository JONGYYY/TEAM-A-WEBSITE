import { NextResponse } from "next/server";
import { generateAssessment } from "@/lib/generateAssessment";
import { chatJSON, hasOpenAI, EVAL_MODEL } from "@/lib/openai";
import { EVAL_SYSTEM, buildEvalUser } from "@/lib/prompts";
import type { StudentProfile, AssessmentReport } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Produces an admissions evaluation. If OPENAI_API_KEY is set, calls OpenAI
 * with a calibrated, bias-aware, JSON-first contract; otherwise (or on any
 * failure) falls back to a deterministic, profile-aware local generator so the
 * product always works.
 */
export async function POST(req: Request) {
  const { profile } = (await req.json()) as { profile: StudentProfile };

  if (hasOpenAI()) {
    try {
      const raw = await chatJSON<Partial<AssessmentReport>>({
        model: EVAL_MODEL,
        system: EVAL_SYSTEM,
        user: buildEvalUser(profile),
        temperature: 0.4,
        maxTokens: 4096,
      });
      const report = validate(raw, profile);
      if (report) return NextResponse.json({ report, source: "openai" });
    } catch {
      /* fall through to local generator */
    }
  }

  await new Promise((r) => setTimeout(r, 700));
  return NextResponse.json({ report: generateAssessment(profile), source: "local" });
}

const RADAR_KEYS = ["academic", "extracurricular", "career", "awards", "narrative", "strengths", "redFlags"] as const;

/** Light shape check + normalization. Returns null if the model output is unusable. */
function validate(r: Partial<AssessmentReport>, profile: StudentProfile): AssessmentReport | null {
  if (!r || typeof r !== "object") return null;
  if (!r.academic || !r.extracurricular || !r.career || !r.awards || !r.narrative) return null;

  const clamp5 = (n: unknown) => {
    const x = Number(n);
    return Number.isFinite(x) ? Math.max(1, Math.min(5, Math.round(x * 10) / 10)) : 3;
  };
  const radarIn = (r.radar || {}) as Record<string, unknown>;
  const radar: Record<string, number> = {};
  for (const k of RADAR_KEYS) radar[k] = clamp5(radarIn[k]);

  // overallScore is on the same 1–5 scale as the radar. If the model returns a
  // 0–100 value by mistake, rescale it; otherwise clamp to 1–5.
  let score = Number(r.overallScore);
  if (!Number.isFinite(score)) {
    score = RADAR_KEYS.reduce((a, k) => a + radar[k], 0) / RADAR_KEYS.length;
  } else if (score > 5) {
    score = score / 20;
  }
  const overallScore = Math.max(0, Math.min(5, Math.round(score * 10) / 10));

  return {
    overallScore,
    verdict: String(r.verdict || "Evaluation complete"),
    radar,
    academic: r.academic,
    extracurricular: r.extracurricular,
    career: r.career,
    awards: r.awards,
    narrative: r.narrative,
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    redFlags: Array.isArray(r.redFlags) ? r.redFlags : [],
    overallAssessment: Array.isArray(r.overallAssessment) ? r.overallAssessment : [],
    actionItems: Array.isArray(r.actionItems) ? r.actionItems : [],
  } as AssessmentReport;
}
