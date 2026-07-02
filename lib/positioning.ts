import type { StudentProfile } from "./types";

export interface Positioning {
  headline: string;
  statement: string;
  angles: { title: string; body: string }[];
  keywords: string[];
  strength: number; // 0–100 confidence the profile is specific enough
}

const TONE: Record<string, string> = {
  excited: "with momentum and a clear sense of where you're headed",
  curious: "driven by genuine curiosity",
  overwhelmed: "steady and intentional, one focused step at a time",
  behind: "ready to convert lost time into a sharp, deliberate arc",
};

/**
 * Deterministic, profile-aware "positioning statement" — the through-line an
 * admissions reader would use to summarize the student in one breath. Mirrors
 * the legacy "Positioning Statement" surface, rebuilt in the Almanac system.
 */
export function buildPositioning(p: StudentProfile): Positioning {
  const interests = Array.from(new Set([...p.intake.interests, ...p.preference.interests]));
  const primary = interests[0];
  const secondary = interests[1];
  const acts = p.activities.filter((a) => a.type || a.organization || a.description);
  const leadership = acts.filter((a) => /president|founder|captain|lead|director|head/i.test(`${a.position} ${a.description}`));
  const awards = p.awards.filter((a) => a.title);
  const grade = p.intake.grade ?? 11;
  const first = p.basic.firstName || "This student";
  const tone = TONE[p.intake.mood ?? ""] ?? "with focus and intent";

  // strength: how much signal we have to work with
  let strength = 18;
  if (primary) strength += 24;
  if (secondary) strength += 10;
  if (acts.length) strength += Math.min(acts.length, 4) * 6;
  if (leadership.length) strength += 12;
  if (awards.length) strength += 10;
  strength = Math.min(96, strength);

  const focus = primary ? primary.toLowerCase() : "an emerging field of interest";
  const builder = leadership.length > 0;

  const headline = primary
    ? builder
      ? `A builder in ${primary}`
      : `A focused ${primary} student`
    : "An explorer finding their direction";

  const lead = leadership[0];
  const leadPhrase = lead
    ? `${lead.position || "leading"}${lead.organization ? ` at ${lead.organization}` : ""}`
    : "taking initiative in your strongest activity";

  const statement = [
    `${first} is ${strength >= 55 ? `${headline.toLowerCase()}` : "a developing student"} who shows up ${tone}.`,
    primary
      ? `The through-line is ${focus}${secondary ? `, with a complementary pull toward ${secondary.toLowerCase()}` : ""} — and it shows in how the activities, courses, and goals line up.`
      : `The next move is to name what you want to be known for, then let your activities orbit it.`,
    builder
      ? `Rather than simply joining, you build: ${leadPhrase} is the kind of evidence that makes a profile memorable.`
      : `A single signature moment — founding, leading, or shipping something in ${focus} — would turn interest into a story.`,
    awards.length
      ? `External recognition (${awards.length} honor${awards.length === 1 ? "" : "s"}) backs the self-report, which readers trust.`
      : `Outside validation — a competition, a selective program — would let others vouch for what you already know.`,
  ].join(" ");

  const angles: Positioning["angles"] = [
    {
      title: "The spike",
      body: primary
        ? `Lead with ${focus}. Make every activity, essay, and recommendation reinforce it so a reader can summarize you in one sentence.`
        : `You don't have a spike yet — and that's fine for grade ${grade}. Pick the interest you'd happily spend a summer on and go deep.`,
    },
    {
      title: "The evidence",
      body: builder
        ? `You lead, not just attend. Quantify the impact (people reached, dollars raised, things shipped) so the scope is undeniable.`
        : `Convert participation into ownership. One role where you decide and are accountable beats five where you attend.`,
    },
    {
      title: grade <= 10 ? "The runway" : "The close",
      body: grade <= 10
        ? `You have time on your side. Breadth now, depth later — protect your GPA and let curiosity lead through 10th grade.`
        : `It's calibration season. Tighten the narrative, target the right colleges, and make the application say exactly what your profile already shows.`,
    },
  ];

  const keywords = [
    primary,
    secondary,
    builder ? "leadership" : "initiative",
    awards.length ? "recognized" : "emerging",
    `grade ${grade}`,
  ].filter(Boolean) as string[];

  return { headline, statement, angles, keywords, strength };
}
