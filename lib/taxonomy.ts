import type { StudentProfile, TestType, EnglishTest, EnglishSubScores } from "./types";

export const INTERESTS = [
  "Arts", "Humanities", "Political Science", "Business", "Economics", "Accounting",
  "Communications", "Health and Medicine", "Public and Social Services",
  "Math and Statistics", "Environmental Science", "Computer Technologies", "Science",
  "Education", "Engineering", "English", "History", "Psychology",
];

export const CAREER_CLUSTERS = [
  { name: "Digital Technology", icon: "code", blurb: "Software, data, cybersecurity, AI." },
  { name: "Advanced Manufacturing", icon: "cog", blurb: "Robotics, mechatronics, production." },
  { name: "Arts, Entertainment & Design", icon: "palette", blurb: "Design, media, performing arts." },
  { name: "Healthcare & Human Services", icon: "heart", blurb: "Medicine, nursing, therapy, care." },
  { name: "Education", icon: "book", blurb: "Teaching, curriculum, ed-tech." },
  { name: "Public Service & Safety", icon: "shield", blurb: "Government, law enforcement, defense." },
  { name: "Marketing & Sales", icon: "megaphone", blurb: "Brand, growth, advertising." },
  { name: "Management & Entrepreneurship", icon: "rocket", blurb: "Founding, ops, leadership." },
  { name: "Financial Services", icon: "coins", blurb: "Finance, investing, accounting." },
  { name: "Construction", icon: "ruler", blurb: "Building, architecture, trades." },
  { name: "Supply Chain & Transportation", icon: "truck", blurb: "Logistics, mobility, ops." },
  { name: "Hospitality, Events & Tourism", icon: "globe", blurb: "Travel, events, service." },
  { name: "Agriculture & Natural Resources", icon: "leaf", blurb: "Food, energy, environment." },
  { name: "Law & Government", icon: "scale", blurb: "Law, policy, public affairs." },
];

export const NO_PREF = "No preference";

/**
 * Toggle a value in a multi-select preference array, with a mutually-exclusive
 * "No preference" sentinel: choosing it clears the rest; choosing anything else
 * clears it.
 */
export function togglePref(arr: string[], v: string): string[] {
  if (v === NO_PREF) return arr.includes(NO_PREF) ? [] : [NO_PREF];
  const without = arr.filter((x) => x !== NO_PREF);
  return without.includes(v) ? without.filter((x) => x !== v) : [...without, v];
}

export const REGIONS = ["Northeast", "Southeast", "Midwest", "Southwest", "West", "Pacific Northwest", "International"];
export const INSTITUTION_TYPES = ["Public University", "Private University", "Liberal Arts College", "Community College", "Technical Institute"];
export const SPECIAL_DESIGNATIONS = ["HBCU", "Women's College", "Religiously Affiliated", "Hispanic-Serving", "Tribal College"];
export const CAMPUS_CULTURE = ["Academically Intense", "Collaborative", "Spirited / D1 Sports", "Artsy & Creative", "Politically Engaged", "Greek Life"];
export const SETTINGS = ["Urban", "Suburban", "Rural", "College Town"];
export const AID_IMPORTANCE = ["Critical", "Very Important", "Somewhat Important", "Not a Factor"];

export const GENDERS = ["Male", "Female", "Non-binary / third gender", "Prefer not to say", "Prefer to self-describe"];
export const SCHOOL_YEARS = ["9th Grade", "10th Grade", "11th Grade", "12th Grade", "High School Graduate"];
export const FIRST_GEN = ["Yes, I am a first-generation college student", "No, I'm not a first-generation college student", "I do not wish to identify"];
export const INCOME_BANDS = [
  "Less than $10,000", "$10,000 - $29,999", "$30,000 - $49,999", "$50,000 - $74,999",
  "$75,000 - $99,999", "$100,000 - $149,999", "$150,000 - $200,000", "$200,000 and above", "Unknown",
];
export const RECOGNITION_LEVELS = ["School", "Regional", "State", "National", "International"];

// Comprehensive set of GPA scales used across US + international systems.
export const GPA_SCALES = [
  "4.0",
  "4.3",
  "4.33",
  "4.5",
  "5.0",
  "6.0",
  "7.0",
  "9.0",
  "10.0",
  "12.0",
  "20 (France)",
  "100 (percentage)",
  "Letter grade (A–F)",
  "Other / custom",
];

/**
 * Per-scale metadata that drives placeholder examples and the numeric input
 * bounds/step for the unweighted & weighted GPA fields. Derived from the scale
 * so every scale in GPA_SCALES gets sensible hints automatically.
 */
export function gpaScaleMeta(scale: string): { unw: string; w: string; maxU?: number; maxW?: number; step: number } {
  if (scale.startsWith("100")) return { unw: "e.g. 95", w: "e.g. 98", maxU: 100, maxW: 110, step: 0.1 };
  if (scale.startsWith("Letter") || scale.startsWith("Other") || !scale) {
    return { unw: "Your GPA", w: "Weighted GPA", step: 0.01 };
  }
  const base = parseFloat(scale);
  if (!Number.isFinite(base)) return { unw: "Your GPA", w: "Weighted GPA", step: 0.01 };
  const big = base >= 15; // e.g. 20-point (France) / 100
  const fmt = (n: number) => (big ? String(Math.round(n)) : (Math.round(n * 100) / 100).toFixed(2));
  const unwStrong = base * 0.965;
  const wStrong = Math.min(base + 2, base * 1.15);
  return {
    unw: `e.g. ${fmt(unwStrong)}`,
    w: `e.g. ${fmt(wStrong)}`,
    maxU: big ? base : base + 0.5,
    maxW: big ? base : base + 2,
    step: big ? 0.1 : 0.01,
  };
}

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois",
  "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts",
  "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming", "Puerto Rico", "Guam", "U.S. Virgin Islands",
];

const STATE_ABBR: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico", GU: "Guam",
};

/** Substring/abbreviation search for US states — partial typing finds the match. */
export function searchStates(query: string): { value: string; label: string }[] {
  const q = query.trim().toLowerCase();
  if (!q) return US_STATES.map((s) => ({ value: s, label: s }));
  const abbrHit = STATE_ABBR[q.toUpperCase()];
  const starts: string[] = [];
  const contains: string[] = [];
  for (const st of US_STATES) {
    const l = st.toLowerCase();
    if (l.startsWith(q)) starts.push(st);
    else if (l.includes(q)) contains.push(st);
  }
  const ordered = [...starts, ...contains];
  if (abbrHit && !ordered.includes(abbrHit)) ordered.unshift(abbrHit);
  return ordered.map((s) => ({ value: s, label: s }));
}
export const ACTIVITY_TYPES = [
  "Academic", "Athletics / Sports", "Arts / Performing Arts", "Community Service / Volunteer",
  "Leadership / Student Govt", "Research", "Work / Internship", "Club / Organization",
  "Competition", "Cultural / Religious", "Other",
];
// Full College Board AP catalog, grouped by discipline.
export const AP_SUBJECTS = [
  // Arts
  "AP 2-D Art and Design", "AP 3-D Art and Design", "AP Drawing", "AP Art History", "AP Music Theory",
  // English
  "AP English Language", "AP English Literature",
  // History & Social Science
  "AP African American Studies", "AP Comparative Government and Politics", "AP European History",
  "AP Human Geography", "AP Macroeconomics", "AP Microeconomics", "AP Psychology",
  "AP US Government and Politics", "AP US History", "AP World History: Modern",
  // Math & Computer Science
  "AP Calculus AB", "AP Calculus BC", "AP Computer Science A", "AP Computer Science Principles",
  "AP Precalculus", "AP Statistics",
  // Sciences
  "AP Biology", "AP Chemistry", "AP Environmental Science", "AP Physics 1", "AP Physics 2",
  "AP Physics C: Mechanics", "AP Physics C: Electricity and Magnetism",
  // World Languages & Cultures
  "AP Chinese Language and Culture", "AP French Language and Culture", "AP German Language and Culture",
  "AP Italian Language and Culture", "AP Japanese Language and Culture", "AP Latin",
  "AP Spanish Language", "AP Spanish Literature",
  // Capstone
  "AP Seminar", "AP Research",
];

export const EXAM_TYPES: { id: "AP" | "IB" | "A-Level" | "FrenchBac"; label: string }[] = [
  { id: "AP", label: "AP Subject Testing" },
  { id: "IB", label: "IB Subject Testing" },
  { id: "A-Level", label: "A-Level" },
  { id: "FrenchBac", label: "French Baccalauréat" },
];

/** All selectable tests driving the Testing-step picker. "score" tests (SAT/ACT)
 *  render as a single number; "english" (proficiency) renders a grouped panel;
 *  "subject" tests (AP/IB/A-Level/FrenchBac) render subject lists as tabs. */
export const TEST_TYPES: { id: TestType; label: string; blurb: string; kind: "score" | "subject" | "english" }[] = [
  { id: "SAT", label: "SAT", blurb: "Total score, 400–1600.", kind: "score" },
  { id: "ACT", label: "ACT", blurb: "Composite, 1–36.", kind: "score" },
  { id: "English", label: "English Proficiency", blurb: "TOEFL / IELTS / PTE / Duolingo.", kind: "english" },
  { id: "AP", label: "AP", blurb: "US Advanced Placement — 1–5.", kind: "subject" },
  { id: "IB", label: "IB", blurb: "Int'l Baccalaureate — 1–7 + core.", kind: "subject" },
  { id: "A-Level", label: "A-Level", blurb: "GCE / Cambridge — A*–E.", kind: "subject" },
  { id: "FrenchBac", label: "French Bac", blurb: "Baccalauréat — scored out of 20.", kind: "subject" },
];

/** French Baccalauréat specialty (spécialité) subjects a student may select. */
export const FRENCH_BAC_SPECIALTIES = [
  "Philosophie",
  "Histoire-Géographie",
  "Langue Vivante A (Anglais)",
  "Langue Vivante A (Autre)",
  "Langue Vivante B",
  "Mathématiques",
  "Physique-Chimie",
  "SVT (Sciences de la Vie et de la Terre)",
  "SES (Sciences Économiques et Sociales)",
  "HGGSP (Histoire-Géographie, Géopolitique et Sciences Politiques)",
  "NSI (Numérique et Sciences Informatiques)",
  "LLCER (Langues, Littératures et Cultures Étrangères)",
  "HLP (Humanités, Littérature et Philosophie)",
  "SI (Sciences de l'Ingénieur)",
  "Arts",
  "Éducation Physique et Sportive (EPS)",
];
export const FRENCH_BAC_STATUSES = ["Predicted", "Final"];

/** Mention (French Bac honors) from an overall /20 average. */
export function frenchBacMention(avg: number): string {
  if (avg >= 16) return "Mention Très bien";
  if (avg >= 14) return "Mention Bien";
  if (avg >= 12) return "Mention Assez bien";
  if (avg >= 10) return "Passed";
  return "";
}

/** One English-proficiency test's reporting shape: which sub-skills it uses and
 *  the numeric bounds for each field. */
export interface EnglishTestSpec {
  id: EnglishTest;
  label: string;
  skills: { key: keyof EnglishSubScores; label: string; min: number; max: number; step: number }[];
  overall: { label: string; min: number; max: number; step: number; readOnly?: boolean };
}

export const ENGLISH_TESTS: EnglishTestSpec[] = [
  {
    id: "TOEFL",
    label: "TOEFL iBT",
    skills: [
      { key: "reading", label: "Reading", min: 0, max: 30, step: 1 },
      { key: "listening", label: "Listening", min: 0, max: 30, step: 1 },
      { key: "speaking", label: "Speaking", min: 0, max: 30, step: 1 },
      { key: "writing", label: "Writing", min: 0, max: 30, step: 1 },
    ],
    overall: { label: "Total", min: 0, max: 120, step: 1 },
  },
  {
    id: "IELTS",
    label: "IELTS Academic",
    skills: [
      { key: "reading", label: "Reading", min: 0, max: 9, step: 0.5 },
      { key: "listening", label: "Listening", min: 0, max: 9, step: 0.5 },
      { key: "writing", label: "Writing", min: 0, max: 9, step: 0.5 },
      { key: "speaking", label: "Speaking", min: 0, max: 9, step: 0.5 },
    ],
    overall: { label: "Overall band", min: 0, max: 9, step: 0.5 },
  },
  {
    id: "PTE",
    label: "PTE Academic",
    skills: [
      { key: "reading", label: "Reading", min: 10, max: 90, step: 1 },
      { key: "listening", label: "Listening", min: 10, max: 90, step: 1 },
      { key: "writing", label: "Writing", min: 10, max: 90, step: 1 },
      { key: "speaking", label: "Speaking", min: 10, max: 90, step: 1 },
    ],
    overall: { label: "Overall", min: 10, max: 90, step: 1 },
  },
  {
    id: "Duolingo",
    label: "Duolingo English Test",
    skills: [],
    overall: { label: "Overall", min: 10, max: 160, step: 5 },
  },
];

// IB Diploma Programme subjects, grouped by the six subject groups + core.
export const IB_SUBJECTS = [
  // Group 1: Studies in Language and Literature
  "English A: Language and Literature", "English A: Literature", "Spanish A: Literature",
  // Group 2: Language Acquisition
  "Spanish B", "French B", "Mandarin B", "German B", "Spanish ab initio", "French ab initio",
  // Group 3: Individuals and Societies
  "History", "Geography", "Economics", "Psychology", "Business Management",
  "Global Politics", "Philosophy", "Digital Society",
  // Group 4: Sciences
  "Biology", "Chemistry", "Physics", "Computer Science", "Environmental Systems and Societies", "Sports, Exercise and Health Science",
  // Group 5: Mathematics
  "Mathematics: Analysis and Approaches", "Mathematics: Applications and Interpretation",
  // Group 6: The Arts
  "Visual Arts", "Music", "Theatre", "Film", "Dance",
];
export const IB_LEVELS = ["HL", "SL"];
export const IB_STATUSES = ["Planned", "In progress", "Predicted", "Final"];
export const IB_SCORES = [7, 6, 5, 4, 3, 2, 1];
export const IB_CORE_GRADES = ["A", "B", "C", "D", "E"];
export const IB_CORE_STATUSES = ["Planned", "In progress", "Predicted", "Final"];
export const IB_CAS_STATUSES = ["Planned", "In progress", "Completed"];

// A-Level / Cambridge International.
export const A_LEVEL_CATEGORIES = [
  "Sciences", "Mathematics", "Languages", "Humanities", "Social Sciences", "Arts", "Business", "Other",
];
export const A_LEVEL_SUBJECTS = [
  "Mathematics", "Further Mathematics", "Biology", "Chemistry", "Physics", "Computer Science",
  "Economics", "Business", "Accounting", "History", "Geography", "Psychology", "Sociology",
  "English Literature", "English Language", "French", "Spanish", "German", "Mandarin", "Latin",
  "Art and Design", "Music", "Drama and Theatre", "Physical Education", "Law", "Politics",
];
export const A_LEVEL_LEVELS = ["A-Level", "AS-Level"];
export const A_LEVEL_GRADES = ["A*", "A", "B", "C", "D", "E"];
export const A_LEVEL_STATUSES = ["Planned", "In progress", "Predicted", "Final"];
export const EXAM_BOARDS = ["AQA", "Edexcel (Pearson)", "OCR", "Cambridge (CIE)", "WJEC / Eduqas", "Other"];

export function emptyFrenchBac(): StudentProfile["testing"]["frenchBac"] {
  const blank = () => ({ score: null, status: "" });
  return {
    fw: blank(),
    fo: blank(),
    philo: blank(),
    grandOral: blank(),
    specialties: [
      { subject: "", score: null, status: "" },
      { subject: "", score: null, status: "" },
    ],
  };
}

export function emptyEnglish(): StudentProfile["testing"]["english"] {
  const blank = () => ({ reading: null, listening: null, writing: null, speaking: null, overall: null });
  return {
    test: "",
    scores: { TOEFL: blank(), IELTS: blank(), PTE: blank(), Duolingo: blank() },
  };
}

export function emptyProfile(): StudentProfile {
  return {
    intake: { grade: null, interests: [], primaryGoal: null, mood: null, targetSelectivity: null, completed: false },
    basic: { firstName: "", middleName: "", lastName: "", gender: "", schoolYear: "", gradYear: null, firstGen: "", familyIncomeBand: "", incomeOptIn: false },
    education: { school: "", country: "United States", state: "", city: "", classSize: null, classSizeUnknown: false, classRank: null, rankUnknown: false, gpaScale: "4.0", gpaUnweighted: null, gpaWeighted: null },
    testing: {
      tests: [],
      sat: null,
      act: null,
      ap: [{ subject: "", score: null }],
      ib: [{ subject: "", level: "", score: null, status: "" }],
      ibCore: { tok: { status: "", grade: "" }, ee: { status: "", grade: "" }, cas: { status: "" } },
      aLevel: [{ category: "", subject: "", level: "", grade: "", status: "", board: "" }],
      frenchBac: emptyFrenchBac(),
      english: emptyEnglish(),
      noTestsYet: false,
    },
    preference: { regions: [], interests: [], institutionType: [], specialDesignation: [], campusCulture: [], financialAidImportance: "", setting: [] },
    awards: [{ title: "", gradeLevel: "", recognition: "" }],
    activities: [{ type: "", position: "", organization: "", grades: [], weeksPerYear: null, hoursPerWeek: null, description: "" }],
    meta: { lastStep: 1, updatedAt: "" },
  };
}

/**
 * Deep-merge a persisted (possibly older-schema) profile onto the current
 * empty profile so newly-added nested fields (e.g. IB/A-Level testing) are
 * always present. Guards against a shallow spread wiping the defaults.
 */
export function normalizeProfile(raw: unknown): StudentProfile {
  const base = emptyProfile();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<StudentProfile>;
  const t = (r.testing || {}) as Partial<StudentProfile["testing"]> & { examType?: string; examTypes?: string[] };
  const core = (t.ibCore || {}) as Partial<StudentProfile["testing"]["ibCore"]>;
  const fbBase = emptyFrenchBac();
  const fb = (t.frenchBac || {}) as Partial<StudentProfile["testing"]["frenchBac"]>;
  const engBase = emptyEnglish();
  const eng = (t.english || {}) as Partial<StudentProfile["testing"]["english"]>;
  const engScores = (eng.scores || {}) as Partial<StudentProfile["testing"]["english"]["scores"]>;

  // Migrate to the unified `tests` array. Sources, in order:
  //  - subject systems from `tests`, legacy `examTypes[]`, or legacy `examType`
  //  - SAT/ACT inferred from present scores (older schemas had no selection)
  const isTest = (x: unknown): x is TestType =>
    x === "SAT" || x === "ACT" || x === "English" || x === "AP" || x === "IB" || x === "A-Level" || x === "FrenchBac";
  const tests: TestType[] = [];
  const push = (x: TestType) => { if (!tests.includes(x)) tests.push(x); };

  if (Array.isArray(t.tests)) {
    t.tests.filter(isTest).forEach(push);
  } else if (Array.isArray(t.examTypes)) {
    t.examTypes.filter(isTest).forEach(push);
  } else if (isTest(t.examType)) {
    push(t.examType);
  }
  if (t.sat != null) push("SAT");
  if (t.act != null) push("ACT");

  return {
    ...base,
    ...r,
    intake: { ...base.intake, ...r.intake },
    basic: { ...base.basic, ...r.basic },
    education: { ...base.education, ...r.education },
    preference: { ...base.preference, ...r.preference },
    testing: {
      ...base.testing,
      ...t,
      tests,
      ap: Array.isArray(t.ap) && t.ap.length ? t.ap : base.testing.ap,
      ib: Array.isArray(t.ib) && t.ib.length ? t.ib : base.testing.ib,
      aLevel: Array.isArray(t.aLevel) && t.aLevel.length ? t.aLevel : base.testing.aLevel,
      ibCore: {
        tok: { ...base.testing.ibCore.tok, ...(core.tok || {}) },
        ee: { ...base.testing.ibCore.ee, ...(core.ee || {}) },
        cas: { ...base.testing.ibCore.cas, ...(core.cas || {}) },
      },
      frenchBac: {
        fw: { ...fbBase.fw, ...(fb.fw || {}) },
        fo: { ...fbBase.fo, ...(fb.fo || {}) },
        philo: { ...fbBase.philo, ...(fb.philo || {}) },
        grandOral: { ...fbBase.grandOral, ...(fb.grandOral || {}) },
        specialties: Array.isArray(fb.specialties) && fb.specialties.length ? fb.specialties : fbBase.specialties,
      },
      english: {
        test: eng.test === "TOEFL" || eng.test === "IELTS" || eng.test === "PTE" || eng.test === "Duolingo" ? eng.test : "",
        scores: {
          TOEFL: { ...engBase.scores.TOEFL, ...(engScores.TOEFL || {}) },
          IELTS: { ...engBase.scores.IELTS, ...(engScores.IELTS || {}) },
          PTE: { ...engBase.scores.PTE, ...(engScores.PTE || {}) },
          Duolingo: { ...engBase.scores.Duolingo, ...(engScores.Duolingo || {}) },
        },
      },
    },
    awards: Array.isArray(r.awards) && r.awards.length ? r.awards : base.awards,
    activities: Array.isArray(r.activities) && r.activities.length ? r.activities : base.activities,
    meta: { ...base.meta, ...r.meta },
  };
}

/** Profile completion %, weighted across the 7 steps. */
export function completionPct(p: StudentProfile): number {
  let score = 0;
  const w = { basic: 18, education: 16, testing: 12, preference: 18, awards: 12, activities: 18, intake: 6 };
  if (p.intake.completed) score += w.intake;
  if (p.basic.firstName && p.basic.lastName && p.basic.schoolYear) score += w.basic;
  if (p.education.school || p.education.gpaUnweighted) score += w.education;
  if (
    p.testing.noTestsYet ||
    p.testing.sat ||
    p.testing.act ||
    p.testing.ap.some((a) => a.subject) ||
    p.testing.ib.some((a) => a.subject) ||
    p.testing.aLevel.some((a) => a.subject)
  ) score += w.testing;
  if (p.preference.interests.length || p.preference.regions.length) score += w.preference;
  if (p.awards.some((a) => a.title)) score += w.awards;
  if (p.activities.some((a) => a.type || a.organization)) score += w.activities;
  return Math.min(100, Math.round(score));
}
