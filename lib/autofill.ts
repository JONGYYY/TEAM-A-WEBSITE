import type { StudentProfile } from "./types";
import { matchAP } from "./apMatch";

/** Reject binary/zip junk (e.g. a raw .docx read client-side) so we never scrape it. */
function isReadableText(text: string): boolean {
  if (!text) return false;
  const sample = text.slice(0, 2000);
  if (/PK\u0003\u0004|\[Content_Types\]\.xml|xmlns=/.test(sample)) return false;
  const printable = sample.replace(/[^\x20-\x7E\s]/g, "");
  return printable.length / sample.length > 0.85;
}

/** Lightweight, honest résumé text parser — extracts what it can confidently find. */
export function parseResume(text: string, base: StudentProfile): { profile: StudentProfile; found: string[] } {
  const found: string[] = [];
  const next: StudentProfile = JSON.parse(JSON.stringify(base));

  // Never parse binary/zip content that leaked in as "text".
  if (!isReadableText(text)) return { profile: next, found };

  // GPA (unweighted, 0–4.x)
  const gpaMatch = text.match(/\bGPA[:\s]*([0-4](?:\.\d{1,2}))\b/i) || text.match(/\b([0-3]\.\d{2}|4\.0{1,2})\s*\/\s*4(?:\.0)?\b/);
  if (gpaMatch) {
    next.education.gpaUnweighted = Number(gpaMatch[1]);
    found.push(`GPA ${gpaMatch[1]}`);
  }

  // SAT (400–1600)
  const satMatch = text.match(/\bSAT[:\s]*([0-9]{3,4})\b/i);
  if (satMatch) {
    const n = Number(satMatch[1]);
    if (n >= 400 && n <= 1600) { next.testing.sat = n; found.push(`SAT ${n}`); next.testing.noTestsYet = false; }
  }

  // ACT (1–36)
  const actMatch = text.match(/\bACT[:\s]*([0-9]{1,2})\b/i);
  if (actMatch) {
    const n = Number(actMatch[1]);
    if (n >= 1 && n <= 36) { next.testing.act = n; found.push(`ACT ${n}`); }
  }

  // AP subjects — only accept fragments that resolve to a real AP course via
  // matchAP; this drops junk like "AP K w s" that the old naive regex produced.
  const apCandidates = Array.from(text.matchAll(/\bAP\s+([A-Za-z][A-Za-z0-9&:\s\-]{1,34})/g)).map((m) => m[1].trim());
  const resolved: string[] = [];
  for (const frag of apCandidates) {
    const hits = matchAP(`AP ${frag}`);
    if (hits.length && !resolved.includes(hits[0])) resolved.push(hits[0]);
  }
  const uniqueAps = resolved.slice(0, 10);
  if (uniqueAps.length) {
    next.testing.ap = [...uniqueAps.map((subject) => ({ subject, score: null })), { subject: "", score: null }];
    found.push(`${uniqueAps.length} AP subject${uniqueAps.length > 1 ? "s" : ""}`);
  }

  // Activities — bullet/line heuristics
  const lines = text.split(/\n+/).map((l) => l.replace(/^[•\-\*\u2022\u25CF\s]+/, "").trim()).filter((l) => l.length > 8 && l.length < 220);
  const actLines = lines.filter((l) => /president|founder|captain|volunteer|club|team|lead|intern|member|organiz|tutor|coach|editor|treasurer|secretary/i.test(l)).slice(0, 6);
  if (actLines.length) {
    next.activities = [
      ...actLines.map((l) => ({
        type: "", position: "", organization: "", grades: [],
        weeksPerYear: null, hoursPerWeek: null,
        description: l.slice(0, 150),
      })),
      { type: "", position: "", organization: "", grades: [], weeksPerYear: null, hoursPerWeek: null, description: "" },
    ];
    found.push(`${actLines.length} activities`);
  }

  return { profile: next, found };
}

/** Condense a long description to <= max chars at a word boundary. */
export function tidyText(text: string, max = 150): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, "") + "…";
}
