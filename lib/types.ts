export type Grade = 9 | 10 | 11 | 12;

export interface Intake {
  grade: Grade | null;
  interests: string[];
  primaryGoal:
    | "best_fit_colleges"
    | "explore_careers"
    | "find_scholarships"
    | "know_my_chances"
    | null;
  mood: "excited" | "curious" | "overwhelmed" | "behind" | null;
  targetSelectivity: "open" | "selective" | "highly_selective" | "most_selective" | null;
  completed: boolean;
}

export interface BasicInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  schoolYear: string;
  gradYear: number | null;
  firstGen: string;
  familyIncomeBand: string;
  incomeOptIn: boolean;
}

export interface Education {
  school: string;
  country: string;
  state: string;
  city: string;
  classSize: number | null;
  classRank: number | null;
  rankUnknown: boolean;
  gpaScale: string;
  gpaUnweighted: number | null;
  gpaWeighted: number | null;
}

export interface APEntry {
  subject: string;
  score: number | null;
}

export interface Testing {
  sat: number | null;
  act: number | null;
  ap: APEntry[];
  noTestsYet: boolean;
}

export interface Preference {
  regions: string[];
  interests: string[];
  institutionType: string[];
  specialDesignation: string[];
  campusCulture: string[];
  financialAidImportance: string;
  setting: string[];
}

export interface Award {
  title: string;
  gradeLevel: string;
  recognition: string;
}

export interface Activity {
  type: string;
  position: string;
  organization: string;
  grades: string[];
  weeksPerYear: number | null;
  hoursPerWeek: number | null;
  description: string;
}

export interface StudentProfile {
  intake: Intake;
  basic: BasicInfo;
  education: Education;
  testing: Testing;
  preference: Preference;
  awards: Award[];
  activities: Activity[];
  meta: { lastStep: number; updatedAt: string };
}

export interface AssessmentReport {
  overallScore: number;
  verdict: string;
  radar: Record<string, number>;
  academic: {
    rating: string;
    stats: { label: string; value: string; note: string }[];
    comparison: { metric: string; student: string; schoolAvg: string; delta: string }[];
  };
  extracurricular: {
    rating: string;
    items: { tier: number; category: string; title: string; rationale: string }[];
    overall: string[];
  };
  career: { rating: string; doingWell: string[]; differentiated: string[]; trajectory: string[] };
  awards: { rating: string; groups: { level: string; count: number; items: string[] }[]; summary: string };
  narrative: {
    rating: string;
    spike: string;
    committeeDescription: string[];
    fitMetrics: { name: string; pct: number; avg: number; label: string; detail: string }[];
  };
  strengths: { n: number; title: string; points: string[] }[];
  redFlags: { title: string; severity: string; points: string[] }[];
  overallAssessment: string[];
  actionItems: string[];
}
