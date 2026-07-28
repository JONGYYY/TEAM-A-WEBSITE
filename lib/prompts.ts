import type { StudentProfile } from "./types";
import {
  ACTIVITY_TYPES,
  RECOGNITION_LEVELS,
  GENDERS,
  SCHOOL_YEARS,
  GPA_SCALES,
  IB_SUBJECTS,
  IB_LEVELS,
  IB_STATUSES,
  IB_CORE_GRADES,
  A_LEVEL_CATEGORIES,
  A_LEVEL_SUBJECTS,
  A_LEVEL_LEVELS,
  A_LEVEL_GRADES,
  A_LEVEL_STATUSES,
  EXAM_BOARDS,
} from "./taxonomy";

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
   FULL PROFILE EXTRACTION (résumé -> partial profile spanning all steps)
   ========================================================================= */

export const PROFILE_EXTRACT_SYSTEM = `You read a student's résumé/CV text and extract a STRUCTURED PARTIAL PROFILE to pre-fill an application builder. You cover basic info, education, testing (AP OR IB OR A-Level), awards, and activities.

ABSOLUTE RULES
- EVIDENCE ONLY. Extract only what is explicitly written. NEVER invent names, schools, scores, GPAs, or achievements. If something is not stated, leave it "" (string), null (number), or [] (array).
- Do NOT copy raw text, headers, file metadata, or symbols. Produce clean, human values only.
- Map free text to the CLOSEST option in the controlled vocabularies below. If nothing fits, use "".
- Numbers must be plain numbers (no units). Respect ranges: SAT 400-1600, ACT 1-36, AP score 1-5, IB subject score 1-7, unweighted GPA usually 0-4 (or per scale), classSize/classRank positive integers.
- Keep every activity "description" under 150 characters, factual, no hype.

EXAM TYPE (single choice)
- Set testing.examType to whichever ONE system dominates the résumé: "AP" (US AP exams), "IB" (International Baccalaureate), or "A-Level" (GCE/Cambridge A-Levels). Default "AP" if unclear.
- Only populate the array for the chosen system; leave the others empty. If AP: fill "ap". If IB: fill "ib" (+ "ibCore" if TOK/EE/CAS mentioned). If A-Level: fill "aLevel".

Controlled vocabularies:
- basic.gender ∈ ${JSON.stringify(GENDERS)}
- basic.schoolYear ∈ ${JSON.stringify(SCHOOL_YEARS)}
- education.gpaScale ∈ ${JSON.stringify(GPA_SCALES)}
- activity.type ∈ ${JSON.stringify(ACTIVITY_TYPES)}
- award.recognition ∈ ${JSON.stringify(RECOGNITION_LEVELS)} (School < Regional < State < National < International)
- ib.subject ∈ ${JSON.stringify(IB_SUBJECTS)} (closest match)
- ib.level ∈ ${JSON.stringify(IB_LEVELS)}
- ib.status / ibCore statuses ∈ ${JSON.stringify(IB_STATUSES)}
- ibCore.tok.grade / ibCore.ee.grade ∈ ${JSON.stringify(IB_CORE_GRADES)}
- aLevel.category ∈ ${JSON.stringify(A_LEVEL_CATEGORIES)}
- aLevel.subject ∈ ${JSON.stringify(A_LEVEL_SUBJECTS)} (closest match)
- aLevel.level ∈ ${JSON.stringify(A_LEVEL_LEVELS)}
- aLevel.grade ∈ ${JSON.stringify(A_LEVEL_GRADES)}
- aLevel.status ∈ ${JSON.stringify(A_LEVEL_STATUSES)}
- aLevel.board ∈ ${JSON.stringify(EXAM_BOARDS)}
- For AP subjects, write the full "AP <Subject>" name if clearly identifiable, else "" (the server snaps it to the official catalog).
- grade levels use "9th","10th","11th","12th" when stated/implied, else "".

Output STRICT JSON only (no markdown), matching this schema. All keys present; unknowns empty/null.
{
  "basic": { "firstName": string, "middleName": string, "lastName": string, "gender": string, "schoolYear": string, "gradYear": number|null },
  "education": { "school": string, "country": string, "state": string, "city": string, "classSize": number|null, "classRank": number|null, "gpaScale": string, "gpaUnweighted": number|null, "gpaWeighted": number|null },
  "testing": {
    "examType": "AP"|"IB"|"A-Level",
    "sat": number|null, "act": number|null,
    "ap": [{ "subject": string, "score": number|null }],
    "ib": [{ "subject": string, "level": "HL"|"SL"|"", "score": number|null, "status": string }],
    "ibCore": { "tok": { "status": string, "grade": string }, "ee": { "status": string, "grade": string }, "cas": { "status": string } },
    "aLevel": [{ "category": string, "subject": string, "level": "A-Level"|"AS-Level"|"", "grade": string, "status": string, "board": string }]
  },
  "awards": [{ "title": string, "gradeLevel": string, "recognition": string }],
  "activities": [{ "type": string, "position": string, "organization": string, "grades": string[], "weeksPerYear": number|null, "hoursPerWeek": number|null, "description": string }]
}`;

export function buildProfileExtractUser(resumeText: string) {
  return `Extract the partial profile from this résumé text. Return JSON ONLY.

"""
${resumeText.slice(0, 14000)}
"""`;
}

/* =========================================================================
   ACTIVITY DESCRIPTION TIDY (AI rewrite to <=150 chars, preserve meaning)
   ========================================================================= */

export const ACTIVITY_TIDY_SYSTEM = `You rewrite a single college-application activity description so it is at most 150 characters while preserving its concrete meaning.

Rules:
- Keep the same facts, role, and impact. Do NOT invent metrics, titles, or achievements not present.
- Prefer strong action verbs; cut filler and repetition. Keep it factual, no hype, first-person implied (no "I").
- The result MUST be <= 150 characters (count characters, not words). One sentence or two short clauses.
- Return STRICT JSON only: { "description": string }`;

export function buildActivityTidyUser(text: string) {
  return `Rewrite this activity description to <=150 characters, preserving meaning. Return JSON ONLY.

"""
${text.slice(0, 1200)}
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
  awards: { rating: "", groups: [{ level: "", count: 0, items: [{ title: "", significance: 0, impact: 0, note: "" }] }], summary: "" },
  narrative: { rating: "", spike: "", committeeDescription: [""], fitMetrics: [{ name: "", pct: 0, avg: 0, label: "", detail: "" }] },
  strengths: [{ n: 1, title: "", points: [""] }],
  redFlags: [{ title: "", severity: "moderate", points: [""] }],
  overallAssessment: [""],
  actionItems: [""],
  recommendations: {
    majors: [{ name: "", fit: 0, why: "" }],
    colleges: {
      reach: [{ name: "", location: "", fit: 0, why: "" }],
      target: [{ name: "", location: "", fit: 0, why: "" }],
      likely: [{ name: "", location: "", fit: 0, why: "" }],
    },
    summary: "",
  },
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
- academic: GPA, rigor (AP exam count+scores 1-5, OR IB subjects HL/SL scores 1-7 + TOK/EE/CAS core, OR A-Level subjects with grades A*-E), testing relative to target tier. testing.tests is an ARRAY of the tests the student reports (SAT/ACT/AP/IB/A-Level) — they may use more than one system (e.g. both AP and IB); judge rigor across every system they list. 5=top-decile rigor+results for the target tier; 3=solid/average; 1=well below or largely missing with no context.
- extracurricular: depth, leadership, impact, sustained commitment. Classify items into tiers 1 (national/exceptional) to 4 (participatory). 5=clear Tier-1/2 leadership with impact; 3=steady involvement; 1=little/none.
- career: clarity and coherence of direction tied to interests + activities. 5=focused, evidenced trajectory; 3=emerging direction; 1=undefined (note: undefined is normal for 9th/10th — calibrate).
- awards: selectivity and level (School→International) and quantity. 5=national/international honors; 3=regional/state; 1=none yet.

COVERAGE (do NOT drop the student's data):
- extracurricular.items: include an entry for EVERY activity the student submitted, ranked by real impact (highest first), UP TO 10. If they submitted 10 or fewer, include ALL of them — never silently omit activities. If more than 10, keep the 10 highest-impact and note the rest in extracurricular.overall.
- awards.groups: collectively list the student's awards ranked by selectivity/impact (highest first), UP TO 10 total items across the groups. If they submitted 10 or fewer, include ALL of them. Each group's "count" is the true number of that level even if some are beyond the top-10 display.
- Each award item is an OBJECT: { "title", "significance" (1.0-5.0, one decimal), "impact" (1.0-5.0, one decimal), "note" (one concise sentence) }. The two ratings MUST differentiate awards even within the SAME level — e.g. two "International" honors should rarely tie: an International Math Olympiad medal outranks an international online essay contest. Anchors:
  - significance = the honor's INHERENT prestige/selectivity (how hard it is to earn): 5.0 = elite, world-class (IMO/ISEF grand award, Intel/Regeneron finalist); 4.0 = highly selective national; 3.0 = competitive state/regional; 2.0 = school/local; 1.0 = participation.
  - impact = how much THIS award moves THIS student's admissions profile: weigh relevance to their intended major/spike, recency, and how much it corroborates their narrative. A prestigious award unrelated to their story can have lower impact than a slightly less prestigious one that reinforces their spike.
  - note = one sentence explaining why it earned those two ratings. Do NOT invent awards; only rate what the student submitted.
- narrative: is there a coherent "spike"/throughline connecting interests, activities, and goals? 5=distinct, memorable angle; 3=competent but common; 1=scattered/insufficient evidence.
- strengths: overall density of genuine standout qualities (derive from evidence).
- redFlags: 5 = NO meaningful concerns; LOWER scores mean MORE/serious concerns (e.g. grade trend, rigor gaps, thin involvement, inconsistencies). Be specific; if none, say so and score high.

VERDICT must be a short calibrated phrase (e.g. "Strong regional-state profile, building toward selective", not a guarantee).

RECOMMENDATIONS (the "recommendations" object) — best-fit majors and a balanced college list:
- majors: EXACTLY 2 real undergraduate majors that best fit the student's interests, activities, and trajectory. "fit" is 0–100 (how well it matches THIS student). "why" is one concise sentence citing the specific interests/activities it draws on.
- colleges: EXACTLY 2 schools in EACH of reach, target, likely (6 total, all distinct). Use real, well-known U.S. institutions. Tailor to the student's stated major/interests AND preferences when provided (preference.regions, preference.setting, preference.institutionType, preference.specialDesignation) and intake.targetSelectivity.
  - Classify bands RELATIVE TO THIS STUDENT'S stats (GPA, SAT/ACT, rigor): "reach" = admission would be a stretch for their profile; "target" = roughly matched / 50-50; "likely" = comfortably within reach.
  - If the student has no test scores yet (underclassman), reason from GPA/rigor/interests and keep picks directional; still return 2 per band.
  - Each college: "name", "location" (City, ST or state), "fit" 0–100 (program + preference fit, independent of admission odds), and "why" = one concise sentence (why it fits their interests/preferences and why it lands in that band). Do NOT restate the student's GPA/SAT as if it were the school's.
- summary: 1–2 sentences tying the major picks to the college list. Do NOT promise admission anywhere.

Return STRICT JSON ONLY (no markdown, no prose outside JSON) matching the provided schema exactly. Use the exact keys. Arrays may be empty but must be present (EXCEPT recommendations.majors must have 2 and each recommendations.colleges band must have 2). radar keys must be: academic, extracurricular, career, awards, narrative, strengths, redFlags.`;

export function buildEvalUser(profile: StudentProfile) {
  const grade = profile.intake.grade ?? gradeFromSchoolYear(profile.basic.schoolYear);
  const ctx = {
    gradeLevel: grade ?? "unknown",
    targetSelectivity: profile.intake.targetSelectivity ?? "unspecified",
    primaryGoal: profile.intake.primaryGoal ?? "unspecified",
    hasTestScores: !!(profile.testing.sat || profile.testing.act),
    tests: profile.testing.tests,
    apCount: profile.testing.ap.filter((a) => a.subject).length,
    ibCount: profile.testing.ib.filter((a) => a.subject).length,
    aLevelCount: profile.testing.aLevel.filter((a) => a.subject).length,
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

/* =========================================================================
   QUIZ EXTRACTION (counselor uploads a file / pastes text -> questions)
   ========================================================================= */

export const QUIZ_EXTRACT_SYSTEM = `You convert a counselor's document into a structured quiz OR survey.

First decide "kind":
- "quiz": there are objectively correct answers (knowledge/assessment; may have an answer key, points, true/false facts).
- "survey": there are NO correct answers. It measures preference/personality/fit and has a SCORING GUIDE that maps answer choices to categories/types (e.g. "Mostly A → Large Campus", letter-coded options A/B/C, "choose what feels most like you"). Personality/preference quizzes are SURVEYS.

Extract questions ONLY from the provided text. NEVER invent questions.
Choose the best "type" per question:
- "multiple_choice": 3+ answer choices (most survey questions are this).
- "true_false": a statement judged true/false, or exactly two opposing choices.
- "short_answer": brief word/phrase/sentence answer.
- "long_answer": explanation, essay, or open reflection.
For "multiple_choice"/"true_false", populate "options" with the visible choices (for true_false use exactly [{"text":"True"},{"text":"False"}]).

IF kind = "quiz":
- ANSWER KEYS: only set "correctOptionText" or "correctText" if the document clearly marks the correct answer (answer key, asterisk, "Answer:"). Otherwise OMIT. Never guess.
- "points": use stated points; otherwise default to 1.
- Leave "outcomes" empty and omit each option's "outcomeKey".

IF kind = "survey":
- Build "outcomes" from the scoring guide: one per category. "key" is the answer letter/code that maps to it (e.g. "A","B","C"). "label" is the human label (prefer an explicit "Output Label" like "Large Campus Explorer"; else the category name like "Large Campus Preference"). "description" is the explanatory paragraph for that category.
- For EACH option, set "outcomeKey" to the letter/category it corresponds to (by its A/B/C ordering or as the document indicates). Do NOT set correctOptionText/correctText. "points" may be 0.

Derive a concise "title" from the heading; if none, "Untitled".
Output STRICT JSON only, no markdown, matching the schema. Arrays present even if empty.

JSON schema:
{
  "kind": "quiz" | "survey",
  "title": string,
  "outcomes": [{ "key": string, "label": string, "description": string }],
  "questions": [{
    "type": "multiple_choice" | "true_false" | "short_answer" | "long_answer",
    "prompt": string,
    "options": [{ "text": string, "outcomeKey": string }],
    "correctOptionText": string,
    "correctText": string,
    "points": number
  }]
}`;

export function buildQuizExtractUser(text: string) {
  return `Convert the following quiz/survey text into questions. Return JSON ONLY.

"""
${text.slice(0, 16000)}
"""`;
}

/* =========================================================================
   QUIZ GRADING (AI-suggested grades for free-response answers)
   ========================================================================= */

export const QUIZ_GRADE_SYSTEM = `You are a fair, consistent teaching assistant grading a student's free-response answers.

Rules:
- Grade ONLY against the question prompt and any provided rubric or reference answer. Do not penalize style or length unless the rubric requires it.
- "awarded" must be an integer from 0 to "max" (inclusive) for each question. Be calibrated: full marks for a complete correct answer, partial for partially correct, 0 for blank/irrelevant.
- "feedback" is one or two short, constructive sentences addressed to the student. Be specific and kind.
- These are SUGGESTED grades a human counselor will review; never refuse. If an answer is blank, award 0 with brief feedback.
- Output STRICT JSON only matching the schema. Include every questionId you were given.

JSON schema:
{ "grades": [{ "questionId": string, "awarded": number, "feedback": string }] }`;

export interface GradeItem {
  questionId: string;
  prompt: string;
  type: string;
  max: number;
  rubric?: string;
  reference?: string;
  answer: string;
}

export function buildQuizGradeUser(items: GradeItem[]) {
  return `Grade these free-response answers and return JSON ONLY.

${JSON.stringify(items, null, 2)}`;
}
