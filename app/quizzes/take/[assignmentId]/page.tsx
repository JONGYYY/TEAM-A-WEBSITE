"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { QuizGate } from "@/components/QuizGate";
import { QuizRunner } from "@/components/QuizRunner";
import {
  useQuizData,
  getAssignment,
  getQuiz,
  getSubmission,
  saveSubmission,
  autoGrade,
  sumScore,
  isSurvey,
  scoreSurvey,
  uid,
} from "@/lib/quizzes";
import type { Answer, Submission, Quiz } from "@/lib/types";
import s from "../../quizzes.module.css";

export default function TakePage({ params }: { params: { assignmentId: string } }) {
  return (
    <QuizGate requireRole="student">
      <Take assignmentId={params.assignmentId} />
    </QuizGate>
  );
}

function Take({ assignmentId }: { assignmentId: string }) {
  const { user } = useAuth();
  const email = user!.email;

  const data = useQuizData(() => {
    const assignment = getAssignment(assignmentId);
    const quiz = assignment ? getQuiz(assignment.quizId) : undefined;
    const submission = getSubmission(assignmentId, email);
    return { assignment, quiz, submission };
  });

  const { assignment, quiz, submission } = data;

  if (!assignment || !quiz) {
    return <NotFound message="This quiz could not be found. It may have been removed." />;
  }
  if (!assignment.studentEmails.includes(email)) {
    return <NotFound message="This quiz isn't assigned to your account." />;
  }

  function handleSubmit(answers: Answer[]) {
    if (!quiz) return;
    const now = new Date().toISOString();
    if (isSurvey(quiz)) {
      // Surveys are auto-scored by category — no counselor grading needed.
      const sub: Submission = {
        id: submission?.id || uid("sub"),
        assignmentId,
        quizId: quiz.id,
        studentEmail: email,
        answers,
        grades: [],
        status: "graded",
        score: 0,
        maxScore: 0,
        result: scoreSurvey(quiz, answers),
        submittedAt: now,
        gradedAt: now,
      };
      saveSubmission(sub);
      return;
    }
    const { grades, maxScore } = autoGrade(quiz, answers);
    const sub: Submission = {
      id: submission?.id || uid("sub"),
      assignmentId,
      quizId: quiz.id,
      studentEmail: email,
      answers,
      grades,
      status: "submitted",
      score: sumScore(grades),
      maxScore,
      submittedAt: now,
    };
    saveSubmission(sub);
  }

  // Already submitted or graded -> result view
  if (submission && submission.status !== "in_progress") {
    return <Result quizTitle={quiz.title} submission={submission} quiz={quiz} />;
  }

  return (
    <div className="container">
      <QuizRunner quiz={quiz} mode="take" onSubmit={handleSubmit} />
    </div>
  );
}

function Result({ quizTitle, submission, quiz }: { quizTitle: string; submission: Submission; quiz: Quiz }) {
  const graded = submission.status === "graded";

  // Survey result view
  if (submission.result) {
    const r = submission.result;
    const maxCount = Math.max(1, ...r.counts.map((c) => c.count));
    return (
      <div className="container">
        <div className={s.resultWrap}>
          <div className={`${s.resultHero} surface`}>
            <span className={s.resultIcon} data-graded><Icon name="spark" size={28} /></span>
            <span className="eyebrow">{quizTitle} · Your result</span>
            <h1 className={s.resultTitle}>{r.label}</h1>
            {r.description && <p className={s.resultFeedback}>{r.description}</p>}
            <div style={{ marginTop: "1.3rem" }}>
              <Link href="/quizzes" className="btn btn-ghost">Back to My Quizzes</Link>
            </div>
          </div>

          <div className={`${s.resultQ} surface`} style={{ marginTop: "1.2rem" }}>
            <span className="field-label">How your answers tallied</span>
            <div className={s.tallyList}>
              {r.counts.map((c) => (
                <div key={c.outcomeId} className={s.tallyRow} data-win={c.outcomeId === r.outcomeId}>
                  <span className={s.tallyLabel}>{c.label}</span>
                  <span className={s.tallyTrack}><span className={s.tallyFill} style={{ width: `${(c.count / maxCount) * 100}%` }} /></span>
                  <span className={s.tallyCount}>{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className={s.resultWrap}>
        <div className={`${s.resultHero} surface`}>
          <span className={s.resultIcon} data-graded={graded}>
            <Icon name={graded ? "award" : "check"} size={28} />
          </span>
          <span className="eyebrow">{quizTitle}</span>
          {graded ? (
            <>
              <h1 className={s.resultTitle}>Your result is in</h1>
              <div className={s.scoreSummary}>
                <span className={s.scoreBig}>{submission.score}</span>
                <span className={s.scoreMax}>/ {submission.maxScore} points</span>
              </div>
              {submission.feedback && <p className={s.resultFeedback}>{submission.feedback}</p>}
            </>
          ) : (
            <>
              <h1 className={s.resultTitle}>Answers submitted</h1>
              <p className="muted" style={{ maxWidth: "46ch" }}>
                Nice work! Your counselor will review your responses and release your grade. Check back here later.
              </p>
            </>
          )}
          <div style={{ marginTop: "1.3rem" }}>
            <Link href="/quizzes" className="btn btn-ghost">Back to My Quizzes</Link>
          </div>
        </div>

        {graded && quiz && (
          <div className={s.resultList}>
            {quiz.questions.map((q, i) => {
              const g = submission.grades.find((x) => x.questionId === q.id);
              const a = submission.answers.find((x) => x.questionId === q.id);
              const answerText = a?.optionId
                ? (q.options?.find((o) => o.id === a.optionId)?.text ?? "")
                : (a?.text || "");
              return (
                <div key={q.id} className={`${s.resultQ} surface`}>
                  <div className={s.resultQHead}>
                    <span className={s.qNumSmall}>{i + 1}</span>
                    <span className={s.resultPrompt}>{q.prompt}</span>
                    <span className={s.resultPts}>{g?.awarded ?? 0}/{q.points}</span>
                  </div>
                  <div className={s.resultAnswer}>{answerText || <em className="muted">No answer</em>}</div>
                  {g?.feedback && <p className={s.resultQFeedback}><Icon name="spark" size={13} /> {g.feedback}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="container">
      <div className="surface" style={{ textAlign: "center", padding: "3rem 2rem", maxWidth: 560, margin: "2rem auto 0" }}>
        <h1 style={{ marginBottom: "0.4rem" }}>Not available</h1>
        <p className="muted" style={{ marginBottom: "1.2rem" }}>{message}</p>
        <Link href="/quizzes" className="btn btn-ghost">Back to My Quizzes</Link>
      </div>
    </div>
  );
}
