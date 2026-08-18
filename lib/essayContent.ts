import type { EssayPart, EssayStatus, StudentProfile } from "./types";

/**
 * The application cycle we tag newly-sourced/selected prompts with. Prompts are
 * categorized by year so colleges that rotate prompts stay correct over time.
 */
export function currentCycle(now = new Date()): string {
  // A cycle spans roughly Aug (year N) → Jul (year N+1); flip in August.
  const y = now.getFullYear();
  const start = now.getMonth() >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}

/** Curated well-known colleges shown instantly as you type (and an offline
 *  fallback when the directory API is unreachable). */
export const COMMON_COLLEGES: string[] = [
  "Harvard University", "Stanford University", "Massachusetts Institute of Technology",
  "Yale University", "Princeton University", "Columbia University", "University of Pennsylvania",
  "Brown University", "Dartmouth College", "Cornell University", "Duke University",
  "University of Chicago", "Northwestern University", "Johns Hopkins University",
  "California Institute of Technology", "Vanderbilt University", "Rice University",
  "University of California, Berkeley", "University of California, Los Angeles",
  "University of California, San Diego", "University of California, Irvine",
  "University of Michigan", "University of Virginia", "University of North Carolina at Chapel Hill",
  "University of Texas at Austin", "Georgia Institute of Technology", "New York University",
  "University of Southern California", "Carnegie Mellon University", "Boston University",
  "Boston College", "Georgetown University", "University of Notre Dame",
  "University of Florida", "University of Washington", "University of Illinois Urbana-Champaign",
  "University of Wisconsin-Madison", "Purdue University", "Ohio State University",
  "Pennsylvania State University", "University of Maryland, College Park", "Emory University",
  "Tufts University", "Wake Forest University",
  "Amherst College", "Williams College", "Pomona College", "Swarthmore College",
];

/** The last N application cycles (most recent first), for categorizing prompts. */
export function recentCycles(n = 4, now = new Date()): string[] {
  const cur = currentCycle(now);
  const start = Number(cur.split("-")[0]);
  return Array.from({ length: n }, (_, i) => `${start - i}-${start - i + 1}`);
}

/** True once the student has real extracurricular (activity) data on file —
 *  entered manually or filled from a résumé. Required before starting essays. */
export function hasExtracurriculars(p: StudentProfile): boolean {
  return (p.activities || []).some((a) => (a.position || a.organization || a.description || "").trim().length > 0);
}

/** Common App personal-statement prompts (stable 7; 650-word limit). */
export const COMMON_APP_PROMPTS: { id: string; text: string }[] = [
  { id: "ca1", text: "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story." },
  { id: "ca2", text: "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?" },
  { id: "ca3", text: "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?" },
  { id: "ca4", text: "Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?" },
  { id: "ca5", text: "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others." },
  { id: "ca6", text: "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?" },
  { id: "ca7", text: "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design." },
];

export const COMMON_APP_WORD_LIMIT = 650;

/** Default outline the workspace seeds when an essay has no AI-generated parts. */
export function defaultParts(): EssayPart[] {
  return [
    { id: "hook", label: "Hook", hint: "Open with a specific moment or image that pulls the reader in.", done: false },
    { id: "context", label: "Context", hint: "Set the scene — who, where, and why it matters to you.", done: false },
    { id: "turn", label: "Turning point", hint: "The change, choice, or realization at the heart of the story.", done: false },
    { id: "reflection", label: "Reflection", hint: "What you learned and how it shaped who you are.", done: false },
    { id: "close", label: "Close", hint: "Land the meaning; connect back to the opening.", done: false },
  ];
}

/** Live word count from a Tiptap JSON document (or plain text). */
export function countWords(doc: unknown): number {
  const text = extractText(doc).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/** Convert pasted / extracted plain text into a Tiptap document (paragraphs). */
export function textToDoc(text: string): unknown {
  const paras = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}|\n/)
    .map((line) => line.trim())
    .filter((line, i, arr) => line.length > 0 || (i > 0 && arr[i - 1].length > 0)); // drop leading/consecutive blanks
  const content = (paras.length ? paras : [""]).map((line) =>
    line
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  return { type: "doc", content };
}

/* --------------------------- status buckets ------------------------------- */
/** Statuses that live in the "Essay Drafts" section (actively being written). */
export function isDraftStatus(s: EssayStatus): boolean {
  return s === "draft" || s === "in_progress";
}
/** Statuses that live in the "Essay Reviews" section. */
export function isReviewStatus(s: EssayStatus): boolean {
  return s === "in_review" || s === "reviewed" || s === "final";
}
/** Friendly label for any essay status. */
export function statusLabel(s: EssayStatus): string {
  switch (s) {
    case "draft": return "Draft";
    case "in_progress": return "In progress";
    case "in_review": return "In review";
    case "reviewed": return "Reviewed";
    case "final": return "Final";
    case "archived": return "Archived";
    default: return s;
  }
}

/** A compact, human-readable summary of the student's profile for the AI to
 *  brainstorm from. Only includes fields the student actually filled in. */
export function summarizeProfileForEssay(p: StudentProfile): string {
  const lines: string[] = [];
  const name = [p.basic.firstName, p.basic.lastName].filter(Boolean).join(" ").trim();
  if (name) lines.push(`Name: ${name}`);
  if (p.basic.schoolYear) lines.push(`Grade: ${p.basic.schoolYear}`);
  if (p.basic.gender) lines.push(`Gender: ${p.basic.gender}`);
  if (p.education.school) lines.push(`School: ${p.education.school}${p.education.city ? `, ${p.education.city}` : ""}${p.education.state ? `, ${p.education.state}` : ""}${p.education.country && p.education.country !== "United States" ? `, ${p.education.country}` : ""}`);
  if (p.basic.firstGen === "Yes") lines.push("First-generation college student.");
  if (p.education.gpaUnweighted != null) lines.push(`GPA: ${p.education.gpaUnweighted}${p.education.gpaWeighted != null ? ` unweighted / ${p.education.gpaWeighted} weighted` : ""}${p.education.gpaScale ? ` (${p.education.gpaScale})` : ""}`);
  if (p.education.classRank != null && !p.education.rankUnknown) lines.push(`Class rank: ${p.education.classRank}${p.education.classSize != null ? ` of ${p.education.classSize}` : ""}`);

  const interests = [...new Set([...(p.intake.interests || []), ...(p.preference.interests || [])])].filter(Boolean);
  if (interests.length) lines.push(`Interests / intended focus: ${interests.join(", ")}`);
  if (p.intake.primaryGoal) lines.push(`Primary goal: ${p.intake.primaryGoal.replace(/_/g, " ")}`);
  if (p.intake.targetSelectivity) lines.push(`Target selectivity: ${p.intake.targetSelectivity.replace(/_/g, " ")}`);

  const testing = summarizeTesting(p);
  if (testing.length) lines.push(`Testing: ${testing.join("; ")}`);

  const prefBits: string[] = [];
  if (p.preference.setting?.length) prefBits.push(`setting: ${p.preference.setting.join(", ")}`);
  if (p.preference.regions?.length) prefBits.push(`regions: ${p.preference.regions.join(", ")}`);
  if (p.preference.institutionType?.length) prefBits.push(`type: ${p.preference.institutionType.join(", ")}`);
  if (p.preference.campusCulture?.length) prefBits.push(`culture: ${p.preference.campusCulture.join(", ")}`);
  if (prefBits.length) lines.push(`College preferences — ${prefBits.join("; ")}`);

  const acts = (p.activities || []).filter((a) => a.position || a.organization || a.description).slice(0, 10);
  if (acts.length) {
    lines.push("\nActivities:");
    acts.forEach((a) => {
      const head = [a.position, a.organization].filter(Boolean).join(" — ");
      const commit = [
        a.grades?.length ? `grades ${a.grades.join("/")}` : "",
        a.hoursPerWeek != null ? `${a.hoursPerWeek} hrs/wk` : "",
        a.weeksPerYear != null ? `${a.weeksPerYear} wks/yr` : "",
      ].filter(Boolean).join(", ");
      lines.push(`- ${head || a.type}${a.type && head ? ` [${a.type}]` : ""}${commit ? ` (${commit})` : ""}${a.description ? `: ${a.description}` : ""}`);
    });
  }

  const awards = (p.awards || []).filter((a) => a.title).slice(0, 12);
  if (awards.length) {
    lines.push("\nAwards / honors:");
    awards.forEach((a) => lines.push(`- ${a.title}${a.recognition ? ` — ${a.recognition}` : ""}${a.gradeLevel ? ` (grade ${a.gradeLevel})` : ""}`));
  }

  return lines.join("\n").trim();
}

/** Compact testing highlights across the systems the student actually reports. */
function summarizeTesting(p: StudentProfile): string[] {
  const t = p.testing;
  if (!t) return [];
  const out: string[] = [];
  const has = (x: string) => (t.tests || []).includes(x as never);
  if (has("SAT") && t.sat != null) out.push(`SAT ${t.sat}`);
  if (has("ACT") && t.act != null) out.push(`ACT ${t.act}`);
  if (has("AP")) {
    const aps = (t.ap || []).filter((a) => a.subject).map((a) => `${a.subject}${a.score != null ? ` (${a.score})` : ""}`);
    if (aps.length) out.push(`AP: ${aps.slice(0, 12).join(", ")}`);
  }
  if (has("IB")) {
    const ibs = (t.ib || []).filter((a) => a.subject).map((a) => `${a.subject}${a.level ? ` ${a.level}` : ""}${a.score != null ? ` (${a.score})` : ""}`);
    if (ibs.length) out.push(`IB: ${ibs.slice(0, 12).join(", ")}`);
  }
  if (has("A-Level")) {
    const als = (t.aLevel || []).filter((a) => a.subject).map((a) => `${a.subject}${a.grade ? ` ${a.grade}` : ""}`);
    if (als.length) out.push(`A-Level: ${als.slice(0, 12).join(", ")}`);
  }
  if (has("English") && t.english?.test) {
    const sc = t.english.scores?.[t.english.test];
    out.push(`${t.english.test}${sc?.overall != null ? ` ${sc.overall}` : ""}`);
  }
  return out;
}

/** Flattens a Tiptap JSON doc (or string) into plain text. */
export function extractText(doc: unknown): string {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  const node = doc as { type?: string; text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    const parts = node.content.map(extractText);
    // Block-level nodes should read as separate lines.
    const sep = node.type && /doc|paragraph|heading|listItem|blockquote/.test(node.type) ? "\n" : "";
    return parts.join("").concat(sep);
  }
  return "";
}
