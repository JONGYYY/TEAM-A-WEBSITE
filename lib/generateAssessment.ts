import type { StudentProfile, AssessmentReport } from "./types";

const clamp = (n: number, lo = 1, hi = 5) => Math.max(lo, Math.min(hi, n));
const aOrAn = (word: string) => (/^[aeiou]/i.test(word) ? "an" : "a");
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Deterministic, profile-aware evaluation used as a fallback when no LLM key is present. */
export function generateAssessment(p: StudentProfile): AssessmentReport {
  const acts = p.activities.filter((a) => a.type || a.organization || a.description);
  const awards = p.awards.filter((a) => a.title);
  const gpa = p.education.gpaUnweighted ?? 0;
  const sat = p.testing.sat ?? 0;
  const act = p.testing.act ?? 0;
  const apCount = p.testing.ap.filter((a) => a.subject).length;
  const name = `${p.basic.firstName} ${p.basic.lastName}`.trim() || "This student";

  // --- scores ---
  let academic = 2.5;
  if (gpa >= 3.95) academic += 1.6; else if (gpa >= 3.8) academic += 1.2; else if (gpa >= 3.5) academic += 0.7; else if (gpa > 0) academic += 0.3;
  if (sat >= 1550 || act >= 35) academic += 0.9; else if (sat >= 1450 || act >= 33) academic += 0.6; else if (sat >= 1300 || act >= 29) academic += 0.3;
  if (apCount >= 6) academic += 0.4; else if (apCount >= 3) academic += 0.2;
  academic = clamp(round1(academic));

  const nat = awards.filter((a) => /national|international/i.test(a.recognition)).length;
  const stateA = awards.filter((a) => /state/i.test(a.recognition)).length;
  let awardsScore = clamp(round1(2.4 + nat * 0.7 + stateA * 0.35 + Math.min(awards.length, 6) * 0.12));

  const leadership = acts.filter((a) => /president|founder|captain|lead|director/i.test(`${a.position} ${a.description}`)).length;
  const longTerm = acts.filter((a) => (a.weeksPerYear ?? 0) >= 30 || a.grades.length >= 3).length;
  let extracurricular = clamp(round1(2.3 + Math.min(acts.length, 8) * 0.18 + leadership * 0.45 + longTerm * 0.3));

  let career = clamp(round1(2.6 + (p.intake.interests.length ? 0.5 : 0) + Math.min(acts.length, 5) * 0.18 + (apCount >= 3 ? 0.4 : 0)));
  let narrative = clamp(round1((extracurricular + career) / 2 + (leadership ? 0.3 : 0)));
  let strengths = clamp(round1((academic + extracurricular + awardsScore) / 3 + 0.2));

  // red flags: higher score = fewer flags
  const flags: AssessmentReport["redFlags"] = [];
  if (acts.some((a) => a.grades.length === 1 && a.grades[0] === "12th" && /founder|president/i.test(a.position))) {
    flags.push({ title: "A leadership role started senior year — timing raises questions", severity: "moderate", points: ["Late-starting leadership can read as application padding.", "Frame it as the natural evolution of earlier involvement.", "Make the progression explicit in your activity description."] });
  }
  if (!acts.some((a) => /\d/.test(a.description))) {
    flags.push({ title: "No quantified impact in activity descriptions", severity: "moderate", points: ["Admissions readers want numbers: $ raised, people served, events run.", "Add concrete figures to at least your top 3 activities.", "Impact you can't measure is impact a reader can't credit."] });
  }
  if (apCount > 0 && p.testing.ap.some((a) => a.subject && a.score == null)) {
    flags.push({ title: "AP scores are missing", severity: "minor", points: ["List exam scores so readers can gauge rigor.", "Strong scores reinforce a strong GPA.", "Add them in the Common App course section."] });
  }
  if (gpa === 0 && sat === 0 && act === 0) {
    flags.push({ title: "Academic data is incomplete", severity: "moderate", points: ["The committee can't assess academics without GPA or test scores.", "Add your GPA and any scores to get a real read.", "This is the single biggest lever on your evaluation."] });
  }
  const redFlags = clamp(round1(5 - flags.length * 0.6));

  const radar = { academic, extracurricular, career, awards: awardsScore, narrative, strengths, redFlags };
  const overall = round1((academic * 1.3 + extracurricular * 1.2 + career + awardsScore + narrative + strengths) / 6.5);

  const verdict =
    overall >= 4.4 ? "Exceptional Profile" :
    overall >= 3.8 ? "Highly Competitive" :
    overall >= 3.0 ? "Competitive — Developing" :
    "Early Stage — Lots of Runway";

  // --- academic stats + comparison ---
  const stats: AssessmentReport["academic"]["stats"] = [];
  if (gpa) stats.push({ label: "Unweighted GPA", value: gpa.toFixed(2), note: gpa >= 3.9 ? "Near-perfect" : gpa >= 3.5 ? "Strong" : "Developing" });
  if (p.education.classRank && p.education.classSize) {
    const pctile = round1((p.education.classRank / p.education.classSize) * 100);
    stats.push({ label: "Class Rank", value: `${p.education.classRank} / ${p.education.classSize}`, note: `Top ${pctile < 1 ? "<1" : pctile}%` });
  }
  if (sat) stats.push({ label: "SAT Score", value: String(sat), note: sat >= 1550 ? "99th percentile" : sat >= 1400 ? "Top decile" : "Solid" });
  if (act) stats.push({ label: "ACT Score", value: String(act), note: act >= 34 ? "99th percentile" : "Solid" });
  if (apCount) stats.push({ label: "AP / IB Courses", value: String(apCount), note: apCount >= 6 ? "Rigorous load" : "Good rigor" });

  const comparison: AssessmentReport["academic"]["comparison"] = [];
  if (gpa) comparison.push({ metric: "Unweighted GPA", student: gpa.toFixed(2), schoolAvg: "3.42", delta: gpa >= 3.7 ? "Significantly Above" : gpa >= 3.4 ? "Above" : "At/Below" });
  if (sat) comparison.push({ metric: "SAT Score", student: String(sat), schoolAvg: "1240", delta: sat >= 1400 ? "Significantly Above" : sat >= 1250 ? "Above" : "At/Below" });

  // --- extracurricular items (tiers) ---
  const items = acts.slice(0, 8).map((a) => {
    const lead = /founder|president|captain|director/i.test(a.position);
    const sustained = (a.grades.length >= 3) || (a.weeksPerYear ?? 0) >= 30;
    const tier = lead && sustained ? 1 : lead || sustained ? 2 : a.position ? 3 : 4;
    return {
      tier,
      category: a.type || "Activity",
      title: [a.position, a.organization].filter(Boolean).join(" — ") || a.description.slice(0, 48) || "Activity",
      rationale: tier === 1 ? "Sustained leadership with real scope — a standout." : tier === 2 ? "Leadership or longevity elevates this entry." : tier === 3 ? "A defined role; deepen it for more impact." : "Participation — adds context but limited differentiation.",
    };
  });

  const t1 = items.filter((i) => i.tier === 1).length;
  const overallEC = [
    t1 > 0 ? `${t1} Tier-1 ${t1 === 1 ? "activity anchors" : "activities anchor"} the profile.` : "No Tier-1 activities yet — depth and leadership are the fastest way up.",
    leadership ? "A clear pattern of taking initiative, not just joining." : "Room to step into leadership in your strongest activity.",
    longTerm ? "Multi-year commitment proves authenticity." : "Depth over breadth will strengthen the story — sustain a few, drop the rest.",
  ];

  return {
    overallScore: overall,
    verdict,
    radar,
    academic: {
      rating: academic >= 4.4 ? "Highly Competitive" : academic >= 3.5 ? "Competitive" : "Developing",
      stats: stats.length ? stats : [{ label: "Academics", value: "—", note: "Add GPA & scores" }],
      comparison,
    },
    extracurricular: {
      rating: extracurricular >= 4.4 ? "Exceptional" : extracurricular >= 3.5 ? "Strong" : "Developing",
      items: items.length ? items : [{ tier: 4, category: "—", title: "No activities yet", rationale: "Add your involvements to be evaluated." }],
      overall: overallEC,
    },
    career: {
      rating: career >= 4 ? "Well-Developed" : career >= 3 ? "Emerging" : "Exploratory",
      doingWell: [
        p.intake.interests.length ? `Clear interest signal in ${p.intake.interests.slice(0, 3).join(", ")}.` : "Begin signalling a direction through your activities.",
        apCount >= 3 ? "Academic rigor aligned to a field of interest." : "Layer in coursework that matches your interests.",
      ],
      differentiated: [
        leadership ? "Founding/leading sets you apart from joiners." : "A founded or led initiative would differentiate you.",
        awards.length ? "External recognition validates your strengths." : "Seek external validation (competitions, programs).",
      ],
      trajectory: [
        "Your activities and interests should converge into one coherent story.",
        narrative >= 4 ? "The arc is already legible to a reader." : "Tighten the through-line so a reader can summarize you in a sentence.",
      ],
    },
    awards: {
      rating: awardsScore >= 4.3 ? "Nationally Distinguished" : awardsScore >= 3.3 ? "Strong, Multi-Domain" : "Building",
      groups: [
        { level: "National", count: nat, items: awards.filter((a) => /national|international/i.test(a.recognition)).map((a) => a.title) },
        { level: "State", count: stateA, items: awards.filter((a) => /state/i.test(a.recognition)).map((a) => a.title) },
        { level: "Regional / School", count: awards.length - nat - stateA, items: awards.filter((a) => !/national|international|state/i.test(a.recognition)).map((a) => a.title) },
      ].filter((g) => g.count > 0),
      summary: awards.length ? "Recognition across multiple domains strengthens credibility — breadth of external validation is rare." : "No awards listed yet — add honors to demonstrate external validation.",
    },
    narrative: {
      rating: narrative >= 4.4 ? "Highly Distinctive" : narrative >= 3.5 ? "Coherent" : "Forming",
      spike: spikeFor(p, leadership > 0),
      committeeDescription: [
        `${name} presents as ${aOrAn(verdict)} ${verdict.toLowerCase()} — strengths cluster around ${p.intake.interests[0] || "their chosen field"}.`,
        leadership ? "They build and lead rather than simply participate — a memorable quality." : "With a signature leadership moment, this profile would become memorable.",
      ],
      fitMetrics: [
        { name: "Academic", pct: Math.round(academic / 5 * 100), avg: 68, label: academic >= 4.4 ? "Exceptional" : "Strong", detail: "Based on GPA, rigor, and test scores against a selective applicant baseline." },
        { name: "Curiosity", pct: Math.round((career / 5) * 100), avg: 64, label: "Promising", detail: "Depth and intentionality of academic interests." },
        { name: "Community", pct: Math.round((extracurricular / 5) * 95), avg: 60, label: "Strong", detail: "Service and contribution evident in activities." },
        { name: "Leadership", pct: Math.min(98, 55 + leadership * 12), avg: 58, label: leadership ? "Demonstrated" : "Emerging", detail: "Founded or led initiatives carry the most weight." },
        { name: "Values", pct: Math.round((narrative / 5) * 96), avg: 66, label: "Coherent", detail: "How clearly a consistent set of values comes through." },
        { name: "Diversity", pct: 72, avg: 70, label: "Adds Texture", detail: "Distinct perspective and lived experience." },
      ],
    },
    strengths: buildStrengths(p, { academic, leadership, awards: awards.length, sat, gpa, apCount }),
    redFlags: flags.length ? flags : [{ title: "No major red flags", severity: "minor", points: ["Keep building depth and documenting impact.", "Maintain rigor through senior year."] }],
    overallAssessment: [
      `${name} reads as ${aOrAn(verdict)} ${verdict.toLowerCase()}.`,
      narrative >= 4 ? "The story is coherent and the spike is legible." : "The pieces are here — sharpening the narrative is the next move.",
      flags.length ? "The gaps flagged are largely presentational and fixable before you apply." : "Few weaknesses to address — focus on sustaining momentum.",
    ],
    actionItems: buildActions(p, flags),
  };
}

function spikeFor(p: StudentProfile, hasLeadership: boolean): string {
  const i = p.intake.interests[0] || p.preference.interests[0];
  if (!i) return "An emerging identity — define what you want to be known for.";
  if (hasLeadership) return `A builder in ${i} — turns interest into organizations and outcomes.`;
  return `A focused ${i} student — ready to convert passion into leadership.`;
}

function buildStrengths(p: StudentProfile, m: { academic: number; leadership: number; awards: number; sat: number; gpa: number; apCount: number }): AssessmentReport["strengths"] {
  const out: AssessmentReport["strengths"] = [];
  let n = 1;
  if (m.gpa >= 3.8 || m.sat >= 1450) out.push({ n: n++, title: "Strong academic credentials", points: [m.gpa ? `GPA ${m.gpa.toFixed(2)} signals consistent rigor.` : "Solid academic record.", m.sat ? `SAT ${m.sat} confirms the strength is real.` : "Test-optional strength via coursework.", m.apCount >= 3 ? `${m.apCount} AP courses show you seek challenge.` : "Add rigor to reinforce this."] });
  if (m.leadership) out.push({ n: n++, title: "A builder, not just a joiner", points: ["Founded or led real initiatives.", "Leadership the committee rarely sees among hundreds of members.", "Shows initiative and follow-through."] });
  if (m.awards) out.push({ n: n++, title: "External validation across domains", points: [`${m.awards} recognized honors.`, "Independent judges back up your self-reported strengths.", "Breadth of recognition is hard to fake."] });
  if (p.intake.interests.length) out.push({ n: n++, title: "A clear field of interest", points: [`Focused on ${p.intake.interests.slice(0, 2).join(" & ")}.`, "Direction makes your story easy to tell.", "Aligns activities, courses, and goals."] });
  out.push({ n: n++, title: "Room to grow with intention", points: ["You have time to deepen your strongest thread.", "Small, focused additions will compound.", "Quality of commitment beats quantity of activities."] });
  return out.slice(0, 5);
}

function buildActions(p: StudentProfile, flags: AssessmentReport["redFlags"]): string[] {
  const a: string[] = [];
  if (!p.education.gpaUnweighted) a.push("Add your GPA and any test scores — the biggest lever on your evaluation.");
  if (flags.some((f) => /quantified/i.test(f.title))) a.push("Quantify impact in your top 3 activities ($ raised, people served, events run).");
  if (p.activities.filter((x) => x.type).length < 4) a.push("Deepen your strongest 2–3 activities rather than adding new ones.");
  if (!p.awards.some((x) => x.title)) a.push("Pursue one external competition or program for verifiable recognition.");
  a.push("Reorder activities by impact, not chronology, before you submit.");
  return a.slice(0, 5);
}
