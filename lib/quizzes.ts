"use client";

import { useEffect, useMemo, useState } from "react";
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
   Shared (non-namespaced) localStorage so counselor + student accounts in the
   same browser can see each other's data. Local-demo only.
   ========================================================================= */

const QUIZZES_KEY = "dc.quizzes";
const GROUPS_KEY = "dc.groups";
const ASSIGNMENTS_KEY = "dc.assignments";
const SUBMISSIONS_KEY = "dc.submissions";
const USERS_KEY = "dc.users";
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

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyQuizChange();
  } catch {
    /* ignore */
  }
}

/** Notify open components/tabs that quiz data changed so they can re-read. */
export function notifyQuizChange() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

/* ---------------------------------- roster --------------------------------- */

export function getRoster(): RosterUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, { name: string; email: string; role?: Role }>) : {};
    return Object.values(obj).map((u) => ({ email: u.email, name: u.name, role: u.role ?? "student" }));
  } catch {
    return [];
  }
}

export function getStudents(): RosterUser[] {
  return getRoster().filter((u) => u.role === "student");
}

export function displayName(email: string): string {
  const u = getRoster().find((r) => r.email === email);
  return u?.name || email;
}

/* ---------------------------------- quizzes -------------------------------- */

export function getQuizzes(): Quiz[] {
  return read<Quiz>(QUIZZES_KEY);
}

export function getQuizzesByOwner(email: string): Quiz[] {
  return getQuizzes().filter((q) => q.ownerEmail === email);
}

export function getSurveysByOwner(email: string): Quiz[] {
  return getQuizzesByOwner(email).filter((q) => q.kind === "survey");
}

export function getQuiz(id: string): Quiz | undefined {
  return getQuizzes().find((q) => q.id === id);
}

export function saveQuiz(quiz: Quiz) {
  const all = getQuizzes();
  const idx = all.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) all[idx] = quiz;
  else all.push(quiz);
  write(QUIZZES_KEY, all);
}

export function deleteQuiz(id: string) {
  write(QUIZZES_KEY, getQuizzes().filter((q) => q.id !== id));
  // cascade: remove assignments + submissions for this quiz
  write(ASSIGNMENTS_KEY, getAssignments().filter((a) => a.quizId !== id));
  write(SUBMISSIONS_KEY, getSubmissions().filter((sub) => sub.quizId !== id));
}

/* ---------------------------------- groups --------------------------------- */

export function getGroups(): Group[] {
  return read<Group>(GROUPS_KEY);
}

export function getGroupsByOwner(email: string): Group[] {
  return getGroups().filter((g) => g.ownerEmail === email);
}

export function saveGroup(group: Group) {
  const all = getGroups();
  const idx = all.findIndex((g) => g.id === group.id);
  if (idx >= 0) all[idx] = group;
  else all.push(group);
  write(GROUPS_KEY, all);
}

export function deleteGroup(id: string) {
  write(GROUPS_KEY, getGroups().filter((g) => g.id !== id));
}

/* ------------------------------- assignments ------------------------------- */

export function getAssignments(): Assignment[] {
  return read<Assignment>(ASSIGNMENTS_KEY);
}

export function getAssignment(id: string): Assignment | undefined {
  return getAssignments().find((a) => a.id === id);
}

export function getAssignmentsByOwner(email: string): Assignment[] {
  return getAssignments().filter((a) => a.assignedBy === email);
}

export function getAssignmentsForStudent(email: string): Assignment[] {
  return getAssignments().filter((a) => a.studentEmails.includes(email));
}

/**
 * De-duplicated roster of every student a given counselor has assigned this
 * quiz/survey to (across all assignments). This is the completion denominator,
 * so students who haven't answered yet still appear.
 */
export function getAssignedStudentsForQuiz(quizId: string, ownerEmail: string): string[] {
  const emails = new Set<string>();
  getAssignments()
    .filter((a) => a.quizId === quizId && a.assignedBy === ownerEmail)
    .forEach((a) => a.studentEmails.forEach((e) => emails.add(e)));
  return [...emails];
}

export function createAssignment(input: Omit<Assignment, "id" | "assignedAt">): Assignment {
  const assignment: Assignment = { ...input, id: uid("asg"), assignedAt: new Date().toISOString() };
  write(ASSIGNMENTS_KEY, [...getAssignments(), assignment]);
  return assignment;
}

export function deleteAssignment(id: string) {
  write(ASSIGNMENTS_KEY, getAssignments().filter((a) => a.id !== id));
  write(SUBMISSIONS_KEY, getSubmissions().filter((sub) => sub.assignmentId !== id));
}

/* ------------------------------- submissions ------------------------------- */

export function getSubmissions(): Submission[] {
  return read<Submission>(SUBMISSIONS_KEY);
}

export function getSubmission(assignmentId: string, studentEmail: string): Submission | undefined {
  return getSubmissions().find((s) => s.assignmentId === assignmentId && s.studentEmail === studentEmail);
}

export function getSubmissionsForQuiz(quizId: string): Submission[] {
  return getSubmissions().filter((s) => s.quizId === quizId);
}

export function getSubmissionsForAssignment(assignmentId: string): Submission[] {
  return getSubmissions().filter((s) => s.assignmentId === assignmentId);
}

export function saveSubmission(sub: Submission) {
  const all = getSubmissions();
  const idx = all.findIndex((s) => s.id === sub.id);
  if (idx >= 0) all[idx] = sub;
  else all.push(sub);
  write(SUBMISSIONS_KEY, all);
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

/* ------------------------------- react helper ------------------------------ */

/** Returns a version counter that bumps whenever quiz data changes (this tab or another). */
export function useQuizSync(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
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

/** Convenience: memoize a reader against the sync version. */
export function useQuizData<T>(reader: () => T): T {
  const version = useQuizSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(reader, [version]);
}
