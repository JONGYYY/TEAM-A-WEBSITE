import type { EssayPart, StudentProfile } from "./types";

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

/** A compact, human-readable summary of the student's profile for the AI to
 *  brainstorm from. Only includes fields the student actually filled in. */
export function summarizeProfileForEssay(p: StudentProfile): string {
  const lines: string[] = [];
  const name = [p.basic.firstName, p.basic.lastName].filter(Boolean).join(" ").trim();
  if (name) lines.push(`Name: ${name}`);
  if (p.basic.schoolYear) lines.push(`Grade: ${p.basic.schoolYear}`);
  if (p.education.school) lines.push(`School: ${p.education.school}${p.education.state ? `, ${p.education.state}` : ""}`);
  if (p.basic.firstGen === "Yes") lines.push("First-generation college student.");
  const interests = [...new Set([...(p.intake.interests || []), ...(p.preference.interests || [])])].filter(Boolean);
  if (interests.length) lines.push(`Interests / intended focus: ${interests.join(", ")}`);
  if (p.education.gpaUnweighted != null) lines.push(`GPA: ${p.education.gpaUnweighted}${p.education.gpaScale ? ` (${p.education.gpaScale})` : ""}`);

  const acts = (p.activities || []).filter((a) => a.position || a.organization || a.description).slice(0, 8);
  if (acts.length) {
    lines.push("\nActivities:");
    acts.forEach((a) => {
      const head = [a.position, a.organization].filter(Boolean).join(" — ");
      lines.push(`- ${head || a.type}${a.description ? `: ${a.description}` : ""}`);
    });
  }

  const awards = (p.awards || []).filter((a) => a.title).slice(0, 10);
  if (awards.length) {
    lines.push("\nAwards / honors:");
    awards.forEach((a) => lines.push(`- ${a.title}${a.recognition ? ` (${a.recognition})` : ""}`));
  }

  return lines.join("\n").trim();
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
