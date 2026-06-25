import type { StudentProfile } from "./types";

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
export const GPA_SCALES = ["4.0", "5.0", "100", "Other"];

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

export function emptyProfile(): StudentProfile {
  return {
    intake: { grade: null, interests: [], primaryGoal: null, mood: null, targetSelectivity: null, completed: false },
    basic: { firstName: "", middleName: "", lastName: "", gender: "", schoolYear: "", gradYear: null, firstGen: "", familyIncomeBand: "", incomeOptIn: false },
    education: { school: "", country: "United States", state: "", city: "", classSize: null, classRank: null, rankUnknown: false, gpaScale: "4.0", gpaUnweighted: null, gpaWeighted: null },
    testing: { sat: null, act: null, ap: [{ subject: "", score: null }], noTestsYet: false },
    preference: { regions: [], interests: [], institutionType: [], specialDesignation: [], campusCulture: [], financialAidImportance: "", setting: [] },
    awards: [{ title: "", gradeLevel: "", recognition: "" }],
    activities: [{ type: "", position: "", organization: "", grades: [], weeksPerYear: null, hoursPerWeek: null, description: "" }],
    meta: { lastStep: 1, updatedAt: "" },
  };
}

/** Profile completion %, weighted across the 7 steps. */
export function completionPct(p: StudentProfile): number {
  let score = 0;
  const w = { basic: 18, education: 16, testing: 12, preference: 18, awards: 12, activities: 18, intake: 6 };
  if (p.intake.completed) score += w.intake;
  if (p.basic.firstName && p.basic.lastName && p.basic.schoolYear) score += w.basic;
  if (p.education.school || p.education.gpaUnweighted) score += w.education;
  if (p.testing.noTestsYet || p.testing.sat || p.testing.act || p.testing.ap.some((a) => a.subject)) score += w.testing;
  if (p.preference.interests.length || p.preference.regions.length) score += w.preference;
  if (p.awards.some((a) => a.title)) score += w.awards;
  if (p.activities.some((a) => a.type || a.organization)) score += w.activities;
  return Math.min(100, Math.round(score));
}
