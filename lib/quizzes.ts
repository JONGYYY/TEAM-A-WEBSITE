"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import type {
  Quiz,
  Group,
  Assignment,
  Submission,
  Question,
  Answer,
  QuestionGrade,
  SurveyResult,
  Role,
} from "./types";

/* =========================================================================
   Supabase-backed data layer. Accounts and quiz/survey data are shared across
   devices via Postgres + row-level security, with Realtime for live updates.
   ========================================================================= */

const CHANGE_EVENT = "dc:quizchange";

export interface RosterUser {
  email: string;
  name: string;
  role: Role;
}

export function uid(prefix = "id"): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    /* ignore */
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Notify open components/tabs that quiz data changed so they can re-read. */
export function notifyQuizChange() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

/* ------------------------------- row mappers ------------------------------ */

/* eslint-disable @typescript-eslint/no-explicit-any */
function toQuiz(r: any): Quiz {
  return {
    id: r.id,
    ownerEmail: r.owner_email,
    title: r.title ?? "",
    description: r.description ?? "",
    kind: r.kind ?? "quiz",
    outcomes: r.outcomes ?? undefined,
    questions: (r.questions ?? []) as Question[],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function fromQuiz(q: Quiz) {
  return {
    id: q.id,
    owner_email: q.ownerEmail,
    title: q.title,
    description: q.description,
    kind: q.kind,
    outcomes: q.outcomes ?? null,
    questions: q.questions,
    created_at: q.createdAt,
    updated_at: q.updatedAt,
  };
}
function toGroup(r: any): Group {
  return { id: r.id, ownerEmail: r.owner_email, name: r.name, studentEmails: r.student_emails ?? [] };
}
function fromGroup(g: Group) {
  return { id: g.id, owner_email: g.ownerEmail, name: g.name, student_emails: g.studentEmails };
}
function toAssignment(r: any): Assignment {
  return {
    id: r.id,
    quizId: r.quiz_id,
    assignedBy: r.assigned_by,
    studentEmails: r.student_emails ?? [],
    groupId: r.group_id ?? undefined,
    assignedAt: r.assigned_at,
    dueAt: r.due_at ?? undefined,
  };
}
function toSubmission(r: any): Submission {
  return {
    id: r.id,
    assignmentId: r.assignment_id,
    quizId: r.quiz_id,
    studentEmail: r.student_email,
    answers: (r.answers ?? []) as Answer[],
    grades: (r.grades ?? []) as QuestionGrade[],
    status: r.status,
    score: r.score ?? 0,
    maxScore: r.max_score ?? 0,
    feedback: r.feedback ?? undefined,
    result: (r.result ?? undefined) as SurveyResult | undefined,
    submittedAt: r.submitted_at ?? undefined,
    gradedAt: r.graded_at ?? undefined,
  };
}
function fromSubmission(s: Submission) {
  return {
    id: s.id,
    assignment_id: s.assignmentId,
    quiz_id: s.quizId,
    student_email: s.studentEmail,
    answers: s.answers,
    grades: s.grades,
    status: s.status,
    score: s.score,
    max_score: s.maxScore,
    feedback: s.feedback ?? null,
    result: s.result ?? null,
    submitted_at: s.submittedAt ?? null,
    graded_at: s.gradedAt ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ---------------------------------- roster --------------------------------- */

// In-memory cache so displayName() can stay synchronous inside render.
const rosterCache = new Map<string, RosterUser>();

export async function getRoster(): Promise<RosterUser[]> {
  const { data, error } = await supabase.from("profiles").select("email, name, role");
  if (error || !data) return [];
  const roster = data.map((r) => ({ email: r.email, name: r.name, role: (r.role as Role) ?? "student" }));
  roster.forEach((u) => rosterCache.set(u.email, u));
  return roster;
}

export async function getStudents(): Promise<RosterUser[]> {
  return (await getRoster()).filter((u) => u.role === "student");
}

/** Synchronous best-effort display name from the roster cache (falls back to email). */
export function displayName(email: string): string {
  return rosterCache.get(email)?.name || email;
}

/* ---------------------------------- quizzes -------------------------------- */

export async function getQuizzes(): Promise<Quiz[]> {
  const { data, error } = await supabase.from("quizzes").select("*");
  if (error || !data) return [];
  return data.map(toQuiz);
}

export async function getQuizzesByOwner(email: string): Promise<Quiz[]> {
  const { data, error } = await supabase.from("quizzes").select("*").eq("owner_email", email);
  if (error || !data) return [];
  return data.map(toQuiz);
}

export async function getSurveysByOwner(email: string): Promise<Quiz[]> {
  return (await getQuizzesByOwner(email)).filter((q) => q.kind === "survey");
}

export async function getQuiz(id: string): Promise<Quiz | undefined> {
  const { data, error } = await supabase.from("quizzes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return toQuiz(data);
}

export async function saveQuiz(quiz: Quiz): Promise<void> {
  await supabase.from("quizzes").upsert(fromQuiz(quiz));
  notifyQuizChange();
}

export async function deleteQuiz(id: string): Promise<void> {
  // assignments + submissions cascade via FK ON DELETE CASCADE.
  await supabase.from("quizzes").delete().eq("id", id);
  notifyQuizChange();
}

/* ---------------------------------- groups --------------------------------- */

export async function getGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from("groups").select("*");
  if (error || !data) return [];
  return data.map(toGroup);
}

export async function getGroupsByOwner(email: string): Promise<Group[]> {
  const { data, error } = await supabase.from("groups").select("*").eq("owner_email", email);
  if (error || !data) return [];
  return data.map(toGroup);
}

export async function saveGroup(group: Group): Promise<void> {
  await supabase.from("groups").upsert(fromGroup(group));
  notifyQuizChange();
}

export async function deleteGroup(id: string): Promise<void> {
  await supabase.from("groups").delete().eq("id", id);
  notifyQuizChange();
}

/* ------------------------------- assignments ------------------------------- */

export async function getAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*");
  if (error || !data) return [];
  return data.map(toAssignment);
}

export async function getAssignment(id: string): Promise<Assignment | undefined> {
  const { data, error } = await supabase.from("assignments").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return toAssignment(data);
}

export async function getAssignmentsByOwner(email: string): Promise<Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*").eq("assigned_by", email);
  if (error || !data) return [];
  return data.map(toAssignment);
}

export async function getAssignmentsForStudent(email: string): Promise<Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*").contains("student_emails", [email]);
  if (error || !data) return [];
  return data.map(toAssignment);
}

/**
 * De-duplicated roster of every student a counselor assigned this quiz/survey
 * to (across all assignments). This is the completion denominator, so students
 * who haven't answered yet still appear.
 */
export async function getAssignedStudentsForQuiz(quizId: string, ownerEmail: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select("student_emails")
    .eq("quiz_id", quizId)
    .eq("assigned_by", ownerEmail);
  if (error || !data) return [];
  const emails = new Set<string>();
  data.forEach((a) => (a.student_emails ?? []).forEach((e: string) => emails.add(e)));
  return [...emails];
}

export async function createAssignment(input: Omit<Assignment, "id" | "assignedAt">): Promise<Assignment> {
  const row = {
    id: uid("asg"),
    quiz_id: input.quizId,
    assigned_by: input.assignedBy,
    student_emails: input.studentEmails,
    group_id: input.groupId ?? null,
    assigned_at: new Date().toISOString(),
    due_at: input.dueAt ?? null,
  };
  const { data } = await supabase.from("assignments").insert(row).select().maybeSingle();
  notifyQuizChange();
  return data ? toAssignment(data) : toAssignment(row);
}

export async function deleteAssignment(id: string): Promise<void> {
  // submissions cascade via FK ON DELETE CASCADE.
  await supabase.from("assignments").delete().eq("id", id);
  notifyQuizChange();
}

/* ------------------------------- submissions ------------------------------- */

export async function getSubmissions(): Promise<Submission[]> {
  const { data, error } = await supabase.from("submissions").select("*");
  if (error || !data) return [];
  return data.map(toSubmission);
}

export async function getSubmission(assignmentId: string, studentEmail: string): Promise<Submission | undefined> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("student_email", studentEmail)
    .maybeSingle();
  if (error || !data) return undefined;
  return toSubmission(data);
}

export async function getSubmissionsForQuiz(quizId: string): Promise<Submission[]> {
  const { data, error } = await supabase.from("submissions").select("*").eq("quiz_id", quizId);
  if (error || !data) return [];
  return data.map(toSubmission);
}

export async function getSubmissionsForAssignment(assignmentId: string): Promise<Submission[]> {
  const { data, error } = await supabase.from("submissions").select("*").eq("assignment_id", assignmentId);
  if (error || !data) return [];
  return data.map(toSubmission);
}

export async function saveSubmission(sub: Submission): Promise<void> {
  await supabase.from("submissions").upsert(fromSubmission(sub), { onConflict: "id" });
  notifyQuizChange();
}

/* --------------------------------- grading --------------------------------- */

/** True when a question can be scored deterministically on the client. */
export function isAutoGradable(q: Question): boolean {
  if ((q.type === "multiple_choice" || q.type === "true_false") && q.correctOptionId) return true;
  if (q.type === "short_answer" && q.correctText && q.correctText.trim()) return true;
  return false;
}

/** Free-response questions that should be sent to the AI grader. */
export function needsAiGrading(q: Question): boolean {
  return (q.type === "long_answer" || q.type === "short_answer") && !isAutoGradable(q);
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Deterministically grades the parts we can (MC/TF with a key, exact-match
 * short answers). Free-response and key-less questions get a 0 placeholder with
 * autoGraded=false so the counselor (or AI) can fill them in.
 */
export function autoGrade(quiz: Quiz, answers: Answer[]): {
  grades: QuestionGrade[];
  maxScore: number;
  autoScore: number;
} {
  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  let autoScore = 0;
  let maxScore = 0;
  const grades: QuestionGrade[] = quiz.questions.map((q) => {
    maxScore += q.points;
    const a = byQ.get(q.id);
    if (isAutoGradable(q)) {
      let correct = false;
      if (q.type === "short_answer") correct = !!a?.text && norm(a.text) === norm(q.correctText || "");
      else correct = !!a?.optionId && a.optionId === q.correctOptionId;
      const awarded = correct ? q.points : 0;
      autoScore += awarded;
      return { questionId: q.id, awarded, max: q.points, autoGraded: true };
    }
    return { questionId: q.id, awarded: 0, max: q.points, autoGraded: false };
  });
  return { grades, maxScore, autoScore };
}

export function sumScore(grades: QuestionGrade[]): number {
  return grades.reduce((acc, g) => acc + (Number.isFinite(g.awarded) ? g.awarded : 0), 0);
}

/* --------------------------------- surveys --------------------------------- */

export function isSurvey(quiz: Quiz | undefined): boolean {
  return quiz?.kind === "survey";
}

/**
 * Scores a survey by tallying how many answers map to each outcome, then picks
 * the outcome with the most answers (ties resolve to the earliest outcome).
 */
export function scoreSurvey(quiz: Quiz, answers: Answer[]): SurveyResult {
  const outcomes = quiz.outcomes || [];
  const counts = new Map<string, number>();
  outcomes.forEach((o) => counts.set(o.id, 0));

  const byQ = new Map(answers.map((a) => [a.questionId, a]));
  for (const q of quiz.questions) {
    const a = byQ.get(q.id);
    if (!a?.optionId) continue;
    const opt = q.options?.find((o) => o.id === a.optionId);
    if (opt?.outcomeId && counts.has(opt.outcomeId)) {
      counts.set(opt.outcomeId, (counts.get(opt.outcomeId) || 0) + 1);
    }
  }

  let winner = outcomes[0];
  let max = -1;
  for (const o of outcomes) {
    const c = counts.get(o.id) || 0;
    if (c > max) { max = c; winner = o; }
  }

  return {
    outcomeId: winner?.id || "",
    label: winner?.label || "Result",
    description: winner?.description || "",
    counts: outcomes.map((o) => ({ outcomeId: o.id, label: o.label, count: counts.get(o.id) || 0 })),
  };
}

export interface SurveyAggregate {
  completed: number;
  total: number;
  /** How many students landed in each outcome bucket (drives the pie). */
  outcomeDistribution: { outcomeId: string; label: string; count: number; pct: number }[];
  /** Summed per-outcome answer tallies across every completed student. */
  groupLean: { outcomeId: string; label: string; count: number }[];
}

/**
 * Aggregates a survey across the assigned roster. Distribution/lean are computed
 * over completed submissions only, so the charts render with partial data.
 */
export function aggregateSurvey(quiz: Quiz, roster: string[], submissions: Submission[]): SurveyAggregate {
  const outcomes = quiz.outcomes || [];
  const total = roster.length;

  const done = submissions.filter(
    (s) => s.quizId === quiz.id && roster.includes(s.studentEmail) && s.status !== "in_progress" && s.result
  );
  const completed = done.length;

  const winCounts = new Map<string, number>();
  const leanCounts = new Map<string, number>();
  outcomes.forEach((o) => { winCounts.set(o.id, 0); leanCounts.set(o.id, 0); });

  for (const sub of done) {
    const r = sub.result!;
    if (winCounts.has(r.outcomeId)) winCounts.set(r.outcomeId, (winCounts.get(r.outcomeId) || 0) + 1);
    for (const c of r.counts) {
      if (leanCounts.has(c.outcomeId)) leanCounts.set(c.outcomeId, (leanCounts.get(c.outcomeId) || 0) + c.count);
    }
  }

  return {
    completed,
    total,
    outcomeDistribution: outcomes.map((o) => {
      const count = winCounts.get(o.id) || 0;
      return { outcomeId: o.id, label: o.label, count, pct: completed > 0 ? (count / completed) * 100 : 0 };
    }),
    groupLean: outcomes.map((o) => ({ outcomeId: o.id, label: o.label, count: leanCounts.get(o.id) || 0 })),
  };
}

/* ------------------------------- react helpers ----------------------------- */

// One shared Realtime channel for all quiz tables → dispatches CHANGE_EVENT.
let realtimeStarted = false;
function ensureRealtime() {
  if (realtimeStarted || typeof window === "undefined") return;
  realtimeStarted = true;
  try {
    const channel = supabase.channel("dc-quiz-changes");
    for (const table of ["profiles", "quizzes", "groups", "assignments", "submissions"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => notifyQuizChange());
    }
    channel.subscribe();
  } catch {
    realtimeStarted = false;
  }
}

/** Returns a version counter that bumps whenever quiz data changes (this tab, another tab, or another device). */
export function useQuizSync(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    ensureRealtime();
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(CHANGE_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(CHANGE_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return version;
}

/**
 * Runs an async reader against Supabase, re-running whenever quiz data changes
 * or a dependency changes. Returns the latest data plus a loading flag.
 */
export function useQuizData<T>(reader: () => Promise<T>, initial: T, deps: unknown[] = []): { data: T; loading: boolean } {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const readerRef = useRef(reader);
  readerRef.current = reader;
  const version = useQuizSync();

  useEffect(() => {
    let active = true;
    setLoading(true);
    readerRef.current()
      .then((d) => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return { data, loading };
}

/** Convenience: preload the roster into the cache so displayName() works in render. */
export function useRoster(): RosterUser[] {
  const { data } = useQuizData<RosterUser[]>(() => getRoster(), [], []);
  return data;
}
