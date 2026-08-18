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

/** Which French diploma track the student is on. BFI adds 3 extra components. */
export type FrenchDiploma = "BAC" | "BFI";

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

/** French Bac core (tronc commun) — the 9 common subjects. Français is reported
 *  as two rows (written + oral) and Grand Oral is a separate final épreuve. */
export interface FrenchBacCore {
  francaisWritten: FrenchBacScore;
  francaisOral: FrenchBacScore;
  english: FrenchBacScore; // LVA
  thirdLanguage: FrenchBacScore; // LVB
  thirdLanguageName: string; // e.g. "Spanish"
  mathematics: FrenchBacScore;
  sciences: FrenchBacScore;
  historyGeography: FrenchBacScore;
  philosophie: FrenchBacScore;
  moralCivic: FrenchBacScore;
  physicalEducation: FrenchBacScore;
  grandOral: FrenchBacScore;
}

/** BFI-only additional components (Baccalauréat Français International). */
export interface FrenchBacBFI {
  advancedHistory: FrenchBacScore;
  advancedEnglish: FrenchBacScore;
  contemporary: FrenchBacScore;
}

/** French Baccalauréat: diploma track + fixed core + 3 specialties (+ BFI extras). */
export interface FrenchBac {
  diploma: FrenchDiploma;
  core: FrenchBacCore;
  specialties: FrenchBacSpecialty[]; // 3
  bfi: FrenchBacBFI; // only meaningful when diploma === "BFI"
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

/* =========================================================================
   AI Essay Tool
   ========================================================================= */

export type EssayPromptSource = "common_app" | "search" | "user";
export type EssayPromptStatus = "verified" | "unverified";

/** A prompt in the shared, growing dataset. */
export interface EssayPrompt {
  id: string;
  college: string; // "" = Common App / generic
  major: string | null; // null = whole-school prompt
  year: string; // application cycle, e.g. "2026-2027"
  promptText: string;
  wordLimit: number | null;
  source: EssayPromptSource;
  sourceUrl?: string;
  status: EssayPromptStatus;
  createdBy?: string;
  createdAt?: string;
}

/** The prompt details frozen onto an essay at creation, so later dataset edits
 *  never change what the student was answering. */
export interface EssayPromptSnapshot {
  promptId?: string;
  college: string;
  major: string | null;
  year: string;
  promptText: string;
  wordLimit: number | null;
  source: EssayPromptSource;
}

/** One outline step the essay is broken into (Hook, Context, …). */
export interface EssayPart {
  id: string;
  label: string;
  hint: string;
  done: boolean;
}

export type EssayStatus = "draft" | "in_progress" | "in_review" | "reviewed" | "final" | "archived";

/** One category bar in the structured feedback (Aslo-style). */
export interface EssayScoreCategory {
  key: string;
  label: string;
  score: number; // 0-100
  note: string;
}

export type EssaySuggestionSeverity = "high" | "medium" | "low";
export type EssaySuggestionStatus = "open" | "resolved" | "ignored";

/** A specific, quote-anchored revision note (Appybara-style "suggestion"):
 *  a verbatim excerpt from the draft, what's weak about it, and how to fix it. */
export interface EssaySuggestion {
  id: string;
  category: string; // e.g. "Show, don't tell", "Cliché", "Prompt drift"
  severity: EssaySuggestionSeverity;
  quote: string; // verbatim excerpt copied from the essay (for locating in-editor)
  issue: string; // one sentence on what's weak
  fix: string; // one sentence on how to improve it
  rewrite?: string | null; // optional improved passage the student can apply in one click
  status?: EssaySuggestionStatus; // client-side: open (default) | resolved | ignored
}

export interface EssayScore {
  overall: number; // 0-100
  categories: EssayScoreCategory[];
  strengths: string[];
  improvements: string[];
  suggestions?: EssaySuggestion[];
  gradedAt: string;
}

export interface Essay {
  id: string;
  ownerEmail: string;
  promptId?: string;
  promptSnapshot: EssayPromptSnapshot;
  title: string;
  content: unknown; // Tiptap document JSON
  parts: EssayPart[];
  wordCount: number;
  score?: EssayScore | null;
  status: EssayStatus;
  createdAt: string;
  updatedAt: string;
}

export type EssayCommentKind = "comment" | "ai_feedback";

/** A line-anchored note. Never deleted — only toggled resolved. */
export interface EssayComment {
  id: string;
  essayId: string;
  author: string; // email or "ai"
  kind: EssayCommentKind;
  quotedText: string; // for re-anchoring after edits
  rangeFrom: number | null;
  rangeTo: number | null;
  body: string;
  resolved: boolean;
  createdAt: string;
}

export interface EssayChat {
  id: string;
  essayId: string;
  ownerEmail: string;
  title: string;
  createdAt: string;
}

export interface EssayMessage {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
