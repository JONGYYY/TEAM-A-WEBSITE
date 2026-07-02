"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { QuizGate } from "@/components/QuizGate";
import { staggerParent, riseItem } from "@/lib/motion";
import {
  useQuizData,
  getQuizzesByOwner,
  getAssignmentsByOwner,
  getAssignmentsForStudent,
  getQuiz,
  getSubmission,
  getSubmissionsForQuiz,
  getAssignedStudentsForQuiz,
} from "@/lib/quizzes";
import type { Submission, Quiz } from "@/lib/types";
import s from "./quizzes.module.css";

export default function QuizzesHome() {
  return (
    <QuizGate>
      <Inner />
    </QuizGate>
  );
}

function Inner() {
  const { user, role } = useAuth();
  if (role === "counselor") return <CounselorHome email={user!.email} name={user!.name} />;
  return <StudentHome email={user!.email} name={user!.name} />;
}

/* --------------------------------- counselor -------------------------------- */

function CounselorHome({ email, name }: { email: string; name: string }) {
  const data = useQuizData(() => {
    const quizzes = getQuizzesByOwner(email);
    const assignments = getAssignmentsByOwner(email);
    const quizIds = new Set(quizzes.map((q) => q.id));
    const toReview = assignments
      .flatMap((a) => getSubmissionsForQuiz(a.quizId))
      .filter((sub) => quizIds.has(sub.quizId) && sub.status === "submitted").length;

    // survey completion across the owner's surveys
    let completed = 0;
    let assigned = 0;
    quizzes
      .filter((q) => q.kind === "survey")
      .forEach((q) => {
        const roster = getAssignedStudentsForQuiz(q.id, email);
        assigned += roster.length;
        const done = new Set(
          getSubmissionsForQuiz(q.id)
            .filter((sub) => sub.status !== "in_progress" && sub.result && roster.includes(sub.studentEmail))
            .map((sub) => sub.studentEmail)
        );
        completed += done.size;
      });

    return { quizzes: quizzes.length, assignments: assignments.length, toReview, completed, assigned };
  });

  const actions = [
    { href: "/quizzes/build", icon: "spark", title: "Build a quiz", desc: "Upload a PDF, DOCX, or paste text — we'll turn it into editable questions." },
    { href: "/quizzes/assignments", icon: "calendar", title: "Assign & groups", desc: "Create student groups and assign quizzes to students or a whole group." },
    { href: "/quizzes/results", icon: "pie", title: "Survey results", desc: "Track who's finished and see where your cohort lands with a group breakdown." },
    { href: "/quizzes/submissions", icon: "award", title: "Review submissions", desc: "See completed quizzes, AI-assisted grades, and finalize results." },
  ];

  return (
    <div className="container">
      <PageHeader eyebrow={`Counselor · ${name}`} title="Quizzes" lead="Create quizzes, assign them to students or groups, and review what comes back." />

      <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.statRow}>
        <Stat n={data.quizzes} label="Quizzes & surveys" />
        <Stat n={data.assignments} label="Assignments" />
        <Stat n={data.completed} label="Surveys completed" />
        <Stat n={data.toReview} label="Awaiting review" accent />
      </motion.div>

      <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.actionGrid}>
        {actions.map((a) => (
          <motion.div key={a.href} variants={riseItem}>
            <Link href={a.href} className={`${s.actionCard} surface`}>
              <span className={s.actionIcon}><Icon name={a.icon} size={22} /></span>
              <span className={s.actionTitle}>{a.title}</span>
              <span className={s.actionDesc}>{a.desc}</span>
              <span className={s.actionGo}>Open <Icon name="arrow" size={15} /></span>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function Stat({ n, label, accent }: { n: number; label: string; accent?: boolean }) {
  return (
    <motion.div variants={riseItem} className={s.statCard} data-accent={accent || undefined}>
      <span className={s.statNum}>{n}</span>
      <span className={s.statLabel}>{label}</span>
    </motion.div>
  );
}

/* ---------------------------------- student --------------------------------- */

function StudentHome({ email, name }: { email: string; name: string }) {
  const rows = useQuizData(() =>
    getAssignmentsForStudent(email)
      .map((a) => ({ assignment: a, quiz: getQuiz(a.quizId), submission: getSubmission(a.id, email) }))
      .filter((r) => r.quiz)
      .sort((x, y) => (y.assignment.assignedAt > x.assignment.assignedAt ? 1 : -1))
  );

  return (
    <div className="container">
      <PageHeader eyebrow={`Student · ${name}`} title="My Quizzes" lead="Quizzes your counselor has assigned to you. Pick one to get started." />

      {rows.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="book" size={26} /></span>
          <h3>No quizzes assigned yet</h3>
          <p className="muted">When your counselor assigns you a quiz, it will appear here.</p>
        </div>
      ) : (
        <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.list}>
          {rows.map(({ assignment, quiz, submission }) => {
            const status = statusOf(submission, quiz!);
            return (
              <motion.div key={assignment.id} variants={riseItem}>
                <Link href={`/quizzes/take/${assignment.id}`} className={`${s.quizRow} surface`}>
                  <div className={s.quizMain}>
                    <span className={s.quizTitle}>{quiz!.title}</span>
                    <span className={s.quizMeta}>
                      {quiz!.questions.length} question{quiz!.questions.length === 1 ? "" : "s"}
                      {quiz!.description ? ` · ${quiz!.description}` : ""}
                    </span>
                  </div>
                  <span className={s.statusPill} data-status={status.key}>{status.label}</span>
                  <Icon name="arrow" size={18} className={s.quizArrow} />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function statusOf(sub: Submission | undefined, quiz: Quiz): { key: string; label: string } {
  const survey = quiz.kind === "survey";
  if (!sub || sub.status === "in_progress") {
    return sub ? { key: "progress", label: "In progress" } : { key: "todo", label: survey ? "Take survey" : "Not started" };
  }
  if (sub.status === "graded") {
    if (survey && sub.result) return { key: "graded", label: sub.result.label };
    return { key: "graded", label: `Graded · ${sub.score}/${sub.maxScore}` };
  }
  return { key: "submitted", label: "Submitted" };
}
