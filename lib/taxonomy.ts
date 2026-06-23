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
export const ACTIVITY_TYPES = [
  "Academic", "Athletics / Sports", "Arts / Performing Arts", "Community Service / Volunteer",
  "Leadership / Student Govt", "Research", "Work / Internship", "Club / Organization",
  "Competition", "Cultural / Religious", "Other",
];
export const AP_SUBJECTS = [
  "AP Biology", "AP Calculus AB", "AP Calculus BC", "AP Chemistry", "AP Computer Science A",
  "AP English Language", "AP English Literature", "AP Environmental Science", "AP Human Geography",
  "AP Macroeconomics", "AP Microeconomics", "AP Physics 1", "AP Physics 2", "AP Physics C",
  "AP Psychology", "AP Statistics", "AP US History", "AP World History", "AP US Government",
  "AP Spanish Language", "AP Art History", "AP Studio Art",
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
