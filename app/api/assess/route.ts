import { NextResponse } from "next/server";
import { generateAssessment } from "@/lib/generateAssessment";
import { chatJSON, hasOpenAI, EVAL_MODEL } from "@/lib/openai";
import { EVAL_SYSTEM, buildEvalUser } from "@/lib/prompts";
import { localRecommendations } from "@/lib/recommend";
import type { StudentProfile, AssessmentReport, Recommendations, MajorRec, CollegeRec, AwardImpact } from "@/lib/types";

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
        maxTokens: 8000,
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
    awards: normalizeAwards(r.awards),
    narrative: r.narrative,
    strengths: Array.isArray(r.strengths) ? r.strengths : [],
    redFlags: Array.isArray(r.redFlags) ? r.redFlags : [],
    overallAssessment: Array.isArray(r.overallAssessment) ? r.overallAssessment : [],
    actionItems: Array.isArray(r.actionItems) ? r.actionItems : [],
    recommendations: normalizeRecommendations(r.recommendations, profile),
  } as AssessmentReport;
}

/**
 * Coerces each award item into the { title, significance, impact, note } shape.
 * Tolerates the model returning a bare string, a partial object, or a 0–100
 * scale for the ratings (rescaled to 1–5). Keeps groups/counts intact.
 */
function normalizeAwards(a: AssessmentReport["awards"]): AssessmentReport["awards"] {
  const clampScore = (n: unknown) => {
    let x = Number(n);
    if (!Number.isFinite(x) || x <= 0) return 0; // 0 = "not rated" → UI hides meters
    if (x > 5) x = x / 20; // rescale a stray 0–100 value
    return Math.max(1, Math.min(5, Math.round(x * 10) / 10));
  };
  const toItem = (it: unknown): AwardImpact => {
    if (typeof it === "string") return { title: it, significance: 0, impact: 0, note: "" };
    const o = (it || {}) as Partial<AwardImpact>;
    return {
      title: String(o.title || "").trim(),
      significance: clampScore(o.significance),
      impact: clampScore(o.impact),
      note: String(o.note || "").trim(),
    };
  };
  const groups = Array.isArray(a?.groups)
    ? a.groups.map((g) => ({
        level: String(g?.level || "").trim(),
        count: Number.isFinite(Number(g?.count)) ? Number(g.count) : (Array.isArray(g?.items) ? g.items.length : 0),
        items: Array.isArray(g?.items) ? (g.items as unknown[]).map(toItem).filter((x) => x.title) : [],
      }))
    : [];
  return {
    rating: String(a?.rating || "").trim() || "Building",
    groups,
    summary: String(a?.summary || "").trim(),
  };
}

/**
 * Ensures the recommendations block has exactly 2 majors and 2 colleges per
 * band. Any missing or malformed part is backfilled from the deterministic
 * local recommender so the pop-up and Section 8 always have complete data.
 */
function normalizeRecommendations(raw: unknown, profile: StudentProfile): Recommendations {
  const local = localRecommendations(profile);
  const rec = (raw && typeof raw === "object" ? raw : {}) as Partial<Recommendations>;

  const clampFit = (n: unknown) => {
    const x = Number(n);
    return Number.isFinite(x) ? Math.max(0, Math.min(100, Math.round(x))) : 60;
  };

  const majorsRaw = Array.isArray(rec.majors)
    ? rec.majors.filter((m) => m && typeof m.name === "string" && m.name.trim()).slice(0, 2)
    : [];
  const majors: MajorRec[] = majorsRaw.length >= 2
    ? majorsRaw.map((m) => ({ name: String(m.name).trim(), fit: clampFit(m.fit), why: String(m.why || "").trim() }))
    : local.majors;

  const band = (incoming: unknown, fallback: CollegeRec[]): CollegeRec[] => {
    const arr = Array.isArray(incoming)
      ? incoming.filter((c) => c && typeof c.name === "string" && c.name.trim()).slice(0, 2)
      : [];
    return arr.length >= 2
      ? arr.map((c) => ({
          name: String(c.name).trim(),
          location: String(c.location || "").trim(),
          fit: clampFit(c.fit),
          why: String(c.why || "").trim(),
        }))
      : fallback;
  };

  const colIn = (rec.colleges || {}) as Partial<Recommendations["colleges"]>;
  return {
    majors,
    colleges: {
      reach: band(colIn.reach, local.colleges.reach),
      target: band(colIn.target, local.colleges.target),
      likely: band(colIn.likely, local.colleges.likely),
    },
    summary: typeof rec.summary === "string" && rec.summary.trim() ? rec.summary.trim() : local.summary,
  };
}
