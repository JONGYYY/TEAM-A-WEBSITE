import { NextResponse } from "next/server";
import { generateAssessment } from "@/lib/generateAssessment";
import { isValidReport } from "@/lib/assessmentSchema";
import type { StudentProfile } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Produces an admissions evaluation. If ANTHROPIC_API_KEY is set, calls Claude
 * with a JSON-first contract; otherwise falls back to a deterministic,
 * profile-aware generator so the product works offline. The LLM output is
 * validated against the report schema before it is trusted — a malformed
 * response degrades gracefully to the local generator (PRD §8.4).
 */
export async function POST(req: Request) {
  const { profile } = (await req.json()) as { profile: StudentProfile };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const report = await callClaude(profile, apiKey);
      if (report && isValidReport(report)) {
        return NextResponse.json({ report, source: "anthropic" });
      }
    } catch {
      /* fall through to local generator */
    }
  }

  // Small delay so the "reading your profile" state reads as real work.
  await new Promise((r) => setTimeout(r, 900));
  return NextResponse.json({ report: generateAssessment(profile), source: "local" });
}

async function callClaude(profile: StudentProfile, apiKey: string) {
  const system =
    "You are a veteran college admissions officer simulating a committee review. " +
    "Return ONLY valid JSON matching the provided schema. Be candid, evidence-based, and specific. " +
    "Scores are 1-5 (one decimal). Sections: academic, extracurricular (tier 1-4 items), career, awards, narrative (with spike + fitMetrics), strengths (5), redFlags, overallAssessment, actionItems.";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      system,
      messages: [
        {
          role: "user",
          content:
            "Evaluate this student profile and return JSON only (no prose, no markdown fences). " +
            "Match this TypeScript shape: " +
            JSON.stringify(SHAPE) +
            "\n\nProfile:\n" +
            JSON.stringify(profile),
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const jsonStr = text.replace(/^```json\s*|\s*```$/g, "").trim();
  return JSON.parse(jsonStr);
}

const SHAPE = {
  overallScore: 0,
  verdict: "",
  radar: { academic: 0, extracurricular: 0, career: 0, awards: 0, narrative: 0, strengths: 0, redFlags: 0 },
  academic: { rating: "", stats: [{ label: "", value: "", note: "" }], comparison: [{ metric: "", student: "", schoolAvg: "", delta: "" }] },
  extracurricular: { rating: "", items: [{ tier: 1, category: "", title: "", rationale: "" }], overall: [""] },
  career: { rating: "", doingWell: [""], differentiated: [""], trajectory: [""] },
  awards: { rating: "", groups: [{ level: "", count: 0, items: [""] }], summary: "" },
  narrative: { rating: "", spike: "", committeeDescription: [""], fitMetrics: [{ name: "", pct: 0, avg: 0, label: "", detail: "" }] },
  strengths: [{ n: 1, title: "", points: [""] }],
  redFlags: [{ title: "", severity: "moderate", points: [""] }],
  overallAssessment: [""],
  actionItems: [""],
};
