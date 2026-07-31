export type Grade = 9 | 10 | 11 | 12;

/** Account role. Canonical definition shared by auth and quizzes. */
export type Role = "student" | "counselor";

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
  classSizeUnknown: boolean;
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

export type ExamType = "AP" | "IB" | "A-Level" | "FrenchBac";

/** Every selectable test in the Testing step. SAT/ACT are scalar scores;
 *  English is a grouped proficiency panel; AP/IB/A-Level/FrenchBac (ExamType)
 *  are subject-list systems shown as tabs. */
export type TestType = "SAT" | "ACT" | "English" | ExamType;

/** One English-proficiency exam. */
export type EnglishTest = "TOEFL" | "IELTS" | "PTE" | "Duolingo";

/** One IB Diploma subject (6 subjects across HL/SL, each scored 1-7). */
export interface IBEntry {
  subject: string;
  level: "HL" | "SL" | "";
  score: number | null; // 1-7
  status: string;
}

/** IB core components: TOK & EE are graded A-E (bonus points); CAS is pass/complete. */
export interface IBCore {
  tok: { status: string; grade: string };
  ee: { status: string; grade: string };
  cas: { status: string };
}

/** One A-Level / AS-Level subject. */
export interface ALevelEntry {
  category: string;
  subject: string;
  level: "A-Level" | "AS-Level" | "";
  grade: string; // A*, A, B, C, D, E
  status: string;
  board: string;
}

/** One French Baccalauréat épreuve, scored out of 20 with an exam status. */
export interface FrenchBacScore {
  score: number | null; // 0-20
  status: string; // "" | "Predicted" | "Final"
}

/** A selectable French Bac specialty (spécialité) subject. */
export interface FrenchBacSpecialty {
  subject: string;
  score: number | null; // 0-20
  status: string;
}

/** French Baccalauréat: fixed core épreuves + two specialty subjects. */
export interface FrenchBac {
  fw: FrenchBacScore; // Français - Written (écrit)
  fo: FrenchBacScore; // Français - Oral
  philo: FrenchBacScore; // Philosophie
  grandOral: FrenchBacScore; // Grand Oral
  specialties: FrenchBacSpecialty[]; // typically 2
}

/** Sub-skill scores for an English-proficiency test (not all tests use all). */
export interface EnglishSubScores {
  reading: number | null;
  listening: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
}

/** English proficiency: one active test, but each test's scores persist so
 *  switching between them never loses data. */
export interface EnglishProficiency {
  test: EnglishTest | "";
  scores: Record<EnglishTest, EnglishSubScores>;
}

export interface Testing {
  /** Which tests the student reports. Multi-select; a test's data is retained
   *  even if it's later deselected. */
  tests: TestType[];
  sat: number | null;
  act: number | null;
  ap: APEntry[];
  ib: IBEntry[];
  ibCore: IBCore;
  aLevel: ALevelEntry[];
  frenchBac: FrenchBac;
  english: EnglishProficiency;
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
  meta: { lastStep: number; updatedAt: string; resumeApplied?: boolean };
}

/** One award with two independent 1.0–5.0 ratings so honors at the SAME level
 *  can still be ranked against each other:
 *   - significance: the honor's inherent prestige/selectivity (how hard to earn)
 *   - impact: how much it moves THIS student's admissions profile (relevance/spike fit)
 */
export interface AwardImpact {
  title: string;
  significance: number; // 1.0–5.0
  impact: number; // 1.0–5.0
  note: string; // one concise sentence justifying the two ratings
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
  awards: { rating: string; groups: { level: string; count: number; items: AwardImpact[] }[]; summary: string };
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
  recommendations?: Recommendations;
}

export interface MajorRec {
  name: string;
  fit: number; // 0-100
  why: string;
}

export interface CollegeRec {
  name: string;
  location: string;
  fit: number; // 0-100
  why: string;
}

export interface Recommendations {
  majors: MajorRec[]; // 2
  colleges: {
    reach: CollegeRec[]; // 2
    target: CollegeRec[]; // 2
    likely: CollegeRec[]; // 2
  };
  summary: string;
}

/* =========================================================================
   QUIZZES (counselor <-> student)
   ========================================================================= */

export type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "long_answer";

/** "quiz" = graded right/wrong + points; "survey" = category-scored, labeled outcome. */
export type QuizKind = "quiz" | "survey";

/** A survey result bucket (e.g. "Large Campus Explorer") with its describing copy. */
export interface SurveyOutcome {
  id: string;
  label: string;
  description: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  outcomeId?: string; // survey: which outcome this choice contributes to
}

export interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: QuestionOption[]; // multiple_choice / true_false
  correctOptionId?: string; // answer key for multiple_choice / true_false
  correctText?: string; // optional exact-match key for short_answer
  rubric?: string; // optional guidance for AI grading of free-response
  points: number;
}

export interface Quiz {
  id: string;
  ownerEmail: string;
  title: string;
  description: string;
  kind: QuizKind; // "quiz" (graded) or "survey" (category-scored); legacy = "quiz"
  outcomes?: SurveyOutcome[]; // surveys only
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  ownerEmail: string;
  name: string;
  studentEmails: string[];
}

export interface Assignment {
  id: string;
  quizId: string;
  assignedBy: string; // counselor email
  studentEmails: string[]; // resolved list of student emails
  groupId?: string; // set when assigned to a group
  assignedAt: string;
  dueAt?: string;
}

export interface Answer {
  questionId: string;
  optionId?: string;
  text?: string;
}

export interface QuestionGrade {
  questionId: string;
  awarded: number;
  max: number;
  autoGraded: boolean;
  aiSuggested?: boolean;
  feedback?: string;
}

export type SubmissionStatus = "in_progress" | "submitted" | "graded";

/** Survey scoring outcome for a submission: winning bucket + per-outcome tallies. */
export interface SurveyResult {
  outcomeId: string;
  label: string;
  description: string;
  counts: { outcomeId: string; label: string; count: number }[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  quizId: string;
  studentEmail: string;
  answers: Answer[];
  grades: QuestionGrade[];
  status: SubmissionStatus;
  score: number;
  maxScore: number;
  feedback?: string;
  result?: SurveyResult; // surveys only
  submittedAt?: string;
  gradedAt?: string;
}
