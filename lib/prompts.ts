import type { StudentProfile } from "./types";
import { ACTIVITY_TYPES, RECOGNITION_LEVELS } from "./taxonomy";

/* =========================================================================
   RÉSUMÉ EXTRACTION
   ========================================================================= */

export const RESUME_EXTRACT_SYSTEM = `You extract structured AWARDS and ACTIVITIES from a student's résumé or activity list.

Rules:
- Only extract items that are actually present in the text. NEVER invent, embellish, or infer achievements that are not written.
- If the text contains nothing relevant for a section, return an empty array for it.
- Be precise and conservative. When unsure whether something is an award vs. an activity, classify by intent: a recognition/honor/prize is an award; an ongoing role/club/job/sport/research is an activity.
- Keep every activity "description" under 150 characters, factual, and in the student's voice (no hype).
- Map free-text to the provided controlled vocabularies by choosing the CLOSEST option. If nothing fits, use "" (empty string) — do not guess wildly.
- Grade levels use "9th","10th","11th","12th" when stated or clearly implied; otherwise "".
- Output STRICT JSON only, matching the schema. No markdown, no commentary.

Controlled vocabularies:
- activity.type ∈ ${JSON.stringify(ACTIVITY_TYPES)}
- award.recognition ∈ ${JSON.stringify(RECOGNITION_LEVELS)} (School < Regional < State < National < International)

JSON schema:
{
  "awards": [{ "title": string, "gradeLevel": string, "recognition": string }],
  "activities": [{
    "type": string, "position": string, "organization": string,
    "grades": string[], "weeksPerYear": number|null, "hoursPerWeek": number|null,
    "description": string
  }]
}`;

export function buildResumeExtractUser(resumeText: string, target: "awards" | "activities" | "all") {
  const want =
    target === "all"
      ? "Extract BOTH awards and activities."
      : `Extract ONLY ${target}. Return the other array empty.`;
  return `${want}

Résumé / activity text:
"""
${resumeText.slice(0, 12000)}
"""`;
}

/* =========================================================================
   ADMISSIONS EVALUATION
   ========================================================================= */

/** Canonical output shape the model must return (also used to validate). */
export const ASSESSMENT_SHAPE = {
  overallScore: 4.2,
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

export const EVAL_SYSTEM = `You are an experienced university admissions reader simulating a committee review for a U.S. undergraduate applicant. Your job is an honest, calibrated, evidence-based read — the kind that helps a student improve, not flattery and not discouragement.

CORE PRINCIPLES
1. EVIDENCE ONLY. Base every statement on fields actually present in the profile JSON. Quote/reference specifics (a GPA, a named activity, an AP, an award level). Never invent facts, scores, or achievements.
2. HANDLE MISSING DATA HONESTLY. If a field is empty/null, say it is "not yet provided" and treat it as unknown — do NOT assume it is weak or strong. Lower your confidence and note it as a data gap or an action item rather than penalizing the student as if the data were bad.
3. NO BIAS. Judge merit only on academics, activities, awards, rigor, and demonstrated initiative. Do NOT raise or lower merit ratings based on gender, race/ethnicity, religion, family income, or first-generation status. (Financial/first-gen context may inform aid/scholarship advice in actionItems, but never the academic, extracurricular, career, or awards ratings.)
4. STAY BALANCED. Every section names genuine strengths AND concrete, specific weaknesses or growth areas. Avoid both inflation ("amazing!") and doom. No section should be entirely positive or entirely negative unless the evidence is truly one-sided.
5. CALIBRATE TO CONTEXT. Use the student's grade level and stated target selectivity. Do not penalize a 9th/10th grader for not having SAT/ACT scores, few activities, or no awards yet — frame those as "on track / next steps." Hold a 12th grader targeting most-selective schools to that bar.
6. NO OVERGENERALIZATION. Avoid sweeping claims ("you will get into X", "guaranteed", "no chance"). Speak in terms of profile strength and fit relative to a competitive applicant pool, not deterministic outcomes.

SCORING — every radar axis is 1.0–5.0 (one decimal). overallScore is ALSO on the 1.0–5.0 scale (one decimal) — a holistic weighted read, NOT a 0–100 number and NOT a percentage. Anchors:
- academic: GPA, rigor (AP/IB count + scores), testing relative to target tier. 5=top-decile rigor+results for the target tier; 3=solid/average; 1=well below or largely missing with no context.
- extracurricular: depth, leadership, impact, sustained commitment. Classify items into tiers 1 (national/exceptional) to 4 (participatory). 5=clear Tier-1/2 leadership with impact; 3=steady involvement; 1=little/none.
- career: clarity and coherence of direction tied to interests + activities. 5=focused, evidenced trajectory; 3=emerging direction; 1=undefined (note: undefined is normal for 9th/10th — calibrate).
- awards: selectivity and level (School→International) and quantity. 5=national/international honors; 3=regional/state; 1=none yet.
- narrative: is there a coherent "spike"/throughline connecting interests, activities, and goals? 5=distinct, memorable angle; 3=competent but common; 1=scattered/insufficient evidence.
- strengths: overall density of genuine standout qualities (derive from evidence).
- redFlags: 5 = NO meaningful concerns; LOWER scores mean MORE/serious concerns (e.g. grade trend, rigor gaps, thin involvement, inconsistencies). Be specific; if none, say so and score high.

VERDICT must be a short calibrated phrase (e.g. "Strong regional-state profile, building toward selective", not a guarantee).

Return STRICT JSON ONLY (no markdown, no prose outside JSON) matching the provided schema exactly. Use the exact keys. Arrays may be empty but must be present. radar keys must be: academic, extracurricular, career, awards, narrative, strengths, redFlags.`;

export function buildEvalUser(profile: StudentProfile) {
  const grade = profile.intake.grade ?? gradeFromSchoolYear(profile.basic.schoolYear);
  const ctx = {
    gradeLevel: grade ?? "unknown",
    targetSelectivity: profile.intake.targetSelectivity ?? "unspecified",
    primaryGoal: profile.intake.primaryGoal ?? "unspecified",
    hasTestScores: !!(profile.testing.sat || profile.testing.act),
    apCount: profile.testing.ap.filter((a) => a.subject).length,
    awardCount: profile.awards.filter((a) => a.title).length,
    activityCount: profile.activities.filter((a) => a.type || a.organization).length,
    note:
      grade && grade <= 10
        ? "Underclassman: missing scores/awards/activities are EXPECTED — frame as on-track, not as weaknesses."
        : "Upperclassman: calibrate to the stated target selectivity.",
  };

  return `Evaluate this student and return JSON ONLY matching this exact shape (types are illustrative):
${JSON.stringify(ASSESSMENT_SHAPE)}

Derived context (use it to calibrate; do not contradict the raw profile):
${JSON.stringify(ctx)}

Student profile (the source of truth — cite only what is here):
${JSON.stringify(profile)}`;
}

function gradeFromSchoolYear(sy: string): number | null {
  const m = sy.match(/(9|10|11|12)/);
  return m ? Number(m[1]) : null;
}
