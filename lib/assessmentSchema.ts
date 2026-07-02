import { z } from "zod";

/**
 * Runtime contract for the LLM assessment output (PRD §8.4). The API route
 * validates Claude's JSON against this before trusting it; anything malformed
 * degrades to the deterministic local generator so the UI never sees raw or
 * partial backend text.
 */
const stat = z.object({ label: z.string(), value: z.string(), note: z.string().default("") });
const comparison = z.object({
  metric: z.string(),
  student: z.string(),
  schoolAvg: z.string(),
  delta: z.string(),
});

export const reportSchema = z.object({
  overallScore: z.number(),
  verdict: z.string(),
  radar: z.record(z.string(), z.number()),
  academic: z.object({
    rating: z.string(),
    stats: z.array(stat),
    comparison: z.array(comparison),
  }),
  extracurricular: z.object({
    rating: z.string(),
    items: z.array(
      z.object({
        tier: z.number(),
        category: z.string(),
        title: z.string(),
        rationale: z.string(),
      })
    ),
    overall: z.array(z.string()),
  }),
  career: z.object({
    rating: z.string(),
    doingWell: z.array(z.string()),
    differentiated: z.array(z.string()),
    trajectory: z.array(z.string()),
  }),
  awards: z.object({
    rating: z.string(),
    groups: z.array(
      z.object({ level: z.string(), count: z.number(), items: z.array(z.string()) })
    ),
    summary: z.string(),
  }),
  narrative: z.object({
    rating: z.string(),
    spike: z.string(),
    committeeDescription: z.array(z.string()),
    fitMetrics: z.array(
      z.object({
        name: z.string(),
        pct: z.number(),
        avg: z.number(),
        label: z.string(),
        detail: z.string(),
      })
    ),
  }),
  strengths: z.array(z.object({ n: z.number(), title: z.string(), points: z.array(z.string()) })),
  redFlags: z.array(z.object({ title: z.string(), severity: z.string(), points: z.array(z.string()) })),
  overallAssessment: z.array(z.string()),
  actionItems: z.array(z.string()),
});

/** True if `data` is a structurally valid assessment report. */
export function isValidReport(data: unknown): boolean {
  return reportSchema.safeParse(data).success;
}
