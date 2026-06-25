import { AP_SUBJECTS } from "./taxonomy";

/**
 * Common shorthands students actually type. Keys are canonical AP subjects
 * from the taxonomy; values are aliases / fragments that should match them.
 */
const ALIASES: Record<string, string[]> = {
  // Arts
  "AP 2-D Art and Design": ["2d art", "2 d art", "two dimensional", "2d design", "studio art 2d", "art and design 2d"],
  "AP 3-D Art and Design": ["3d art", "3 d art", "three dimensional", "3d design", "sculpture", "studio art 3d"],
  "AP Drawing": ["drawing", "draw", "studio art drawing"],
  "AP Art History": ["art history", "arthist", "art hist"],
  "AP Music Theory": ["music", "music theory", "theory"],
  // English
  "AP English Language": ["lang", "english lang", "language", "lang comp", "english language and composition", "comp", "ela"],
  "AP English Literature": ["lit", "english lit", "literature", "english literature and composition"],
  // History & Social Science
  "AP African American Studies": ["afam", "african american", "african american studies", "aas", "black studies"],
  "AP Comparative Government and Politics": ["comp gov", "comparative gov", "comparative government", "comp gov pol", "comparative politics"],
  "AP European History": ["euro", "ap euro", "european history", "euro history", "europe"],
  "AP US Government and Politics": ["gov", "gopo", "government", "us gov", "gov and politics", "politics", "us government and politics", "american government", "usgov"],
  "AP US History": ["apush", "us history", "ush", "american history", "u s history"],
  "AP World History: Modern": ["whap", "world", "world history", "apwh", "world history modern", "modern world"],
  "AP Human Geography": ["aphg", "human geo", "geo", "geography", "hug", "humangeo"],
  "AP Macroeconomics": ["macro", "macroeconomics", "macro econ"],
  "AP Microeconomics": ["micro", "microeconomics", "micro econ"],
  "AP Psychology": ["psych", "psychology"],
  // Math & Computer Science
  "AP Calculus AB": ["calc ab", "calculus ab", "ab calc", "calc", "calculus"],
  "AP Calculus BC": ["calc bc", "calculus bc", "bc calc"],
  "AP Computer Science A": ["csa", "comp sci", "cs a", "computer science", "compsci", "cs", "comp sci a"],
  "AP Computer Science Principles": ["csp", "cs principles", "comp sci principles", "computer science principles", "principles"],
  "AP Precalculus": ["precalc", "pre calc", "precalculus", "pre-calculus", "pre calculus"],
  "AP Statistics": ["stat", "stats", "statistics"],
  // Sciences
  "AP Biology": ["bio", "biology"],
  "AP Chemistry": ["chem", "chemistry"],
  "AP Environmental Science": ["apes", "environmental", "enviro", "env sci", "environmental science"],
  "AP Physics 1": ["physics 1", "phys 1", "physics one", "physics"],
  "AP Physics 2": ["physics 2", "phys 2", "physics two"],
  "AP Physics C: Mechanics": ["physics c mech", "phys c mech", "mechanics", "physics c mechanics", "physics c"],
  "AP Physics C: Electricity and Magnetism": ["physics c em", "phys c em", "e and m", "em", "electricity and magnetism", "physics c e and m"],
  // World Languages & Cultures
  "AP Chinese Language and Culture": ["chinese", "mandarin", "chinese lang"],
  "AP French Language and Culture": ["french", "french lang"],
  "AP German Language and Culture": ["german", "german lang"],
  "AP Italian Language and Culture": ["italian", "italian lang"],
  "AP Japanese Language and Culture": ["japanese", "japanese lang"],
  "AP Latin": ["latin"],
  "AP Spanish Language": ["spanish", "spanish lang", "span", "spanish language and culture"],
  "AP Spanish Literature": ["spanish lit", "spanish literature", "span lit"],
  // Capstone
  "AP Seminar": ["seminar", "capstone seminar", "capstone"],
  "AP Research": ["research", "capstone research"],
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[._/]/g, " ")
    .replace(/\bap\b/g, " ")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreSubject(subject: string, q: string): number {
  if (!q) return 1;
  const candidates = [norm(subject), ...(ALIASES[subject] ?? []).map(norm)];
  let best = 0;
  for (const c of candidates) {
    if (!c) continue;
    if (c === q) best = Math.max(best, 100);
    else if (c.startsWith(q)) best = Math.max(best, 70);
    else if (c.includes(q)) best = Math.max(best, 50);
    else if (q.startsWith(c) && c.length >= 3) best = Math.max(best, 45);
  }
  // Token overlap: every typed token appears in some candidate.
  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length && tokens.every((t) => candidates.some((c) => c.includes(t)))) {
    best = Math.max(best, 30);
  }
  return best;
}

/** Returns AP subjects ranked by how well they match the typed query. */
export function matchAP(query: string): string[] {
  const q = norm(query);
  if (!q) return [...AP_SUBJECTS];
  return AP_SUBJECTS
    .map((subject) => ({ subject, score: scoreSubject(subject, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.subject.localeCompare(b.subject))
    .map((x) => x.subject);
}
