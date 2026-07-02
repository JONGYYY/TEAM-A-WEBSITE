import type { StudentProfile, Recommendations, MajorRec, CollegeRec } from "./types";
import { COLLEGES, calibrateColleges, rankMajors } from "./content";

/** Union of the interests collected during intake and in college preferences. */
function profileInterests(profile: StudentProfile): string[] {
  return Array.from(new Set([...profile.intake.interests, ...profile.preference.interests]));
}

function studentSat(profile: StudentProfile): number {
  return profile.testing.sat ?? (profile.testing.act ? Math.round(profile.testing.act * 44) : 0);
}

function listAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function majorWhy(majorInterests: string[], interests: string[]): string {
  const overlap = majorInterests.filter((i) => interests.includes(i)).slice(0, 2);
  if (overlap.length) return `Aligns with your interest in ${listAnd(overlap)}.`;
  return "A versatile fit that keeps strong career options open.";
}

function collegeWhy(
  band: "Reach" | "Target" | "Likely",
  strongMatch: string[],
  loc: string,
): string {
  const strength = strongMatch.length ? ` and is known for ${listAnd(strongMatch.slice(0, 2))}` : "";
  switch (band) {
    case "Reach":
      return `Ambitious given your current scores${strength}. Worth a shot if it excites you (${loc}).`;
    case "Target":
      return `A well-matched school for your profile${strength} (${loc}).`;
    default:
      return `Very attainable with your numbers${strength} (${loc}).`;
  }
}

/**
 * Deterministic recommendations from the built-in catalog. Guarantees exactly
 * 2 majors and 2 colleges per band by assigning bands from the SAT gap and
 * filling any shortfall from the nearest schools. Used as the offline fallback
 * and to backfill an AI report that omits recommendations.
 */
export function localRecommendations(profile: StudentProfile): Recommendations {
  const interests = profileInterests(profile);
  const sat = studentSat(profile);

  // ----- Majors (top 2 by interest fit) -----
  const rankedMajors = rankMajors(interests).slice(0, 2);
  const majors: MajorRec[] = rankedMajors.map(({ major, fit }) => ({
    name: major.name,
    fit,
    why: majorWhy(major.interests, interests),
  }));

  // ----- Colleges: guarantee 2 reach / 2 target / 2 likely -----
  const fitByName = new Map(calibrateColleges(sat, interests).map((c) => [c.college.name, c.fit]));
  const effectiveSat = sat || 1200;

  // Sort hardest -> easiest by SAT gap (avgSat - student SAT).
  const byGap = [...COLLEGES]
    .map((college) => ({
      college,
      gap: college.avgSat - effectiveSat,
      fit: fitByName.get(college.name) ?? 50,
    }))
    .sort((a, b) => b.gap - a.gap || b.fit - a.fit);

  const reachPick = byGap.slice(0, 2);
  const likelyPick = byGap.slice(-2);
  // Target = the two remaining schools closest to a zero gap (best match).
  const middle = byGap.slice(2, byGap.length - 2);
  const targetPick = [...middle].sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap)).slice(0, 2);

  const toRec = (band: "Reach" | "Target" | "Likely") => (entry: (typeof byGap)[number]): CollegeRec => {
    const strongMatch = entry.college.strongIn.filter((i) => interests.includes(i));
    return {
      name: entry.college.name,
      location: entry.college.loc,
      fit: entry.fit,
      why: collegeWhy(band, strongMatch, entry.college.loc),
    };
  };

  const topMajor = majors[0]?.name ?? "your intended field";
  const summary =
    `Based on your profile, ${topMajor} is your strongest major match. ` +
    `Your six-school list below balances ambition with realistic options across reach, target, and likely categories.`;

  return {
    majors,
    colleges: {
      reach: reachPick.map(toRec("Reach")),
      target: targetPick.map(toRec("Target")),
      likely: likelyPick.map(toRec("Likely")),
    },
    summary,
  };
}
