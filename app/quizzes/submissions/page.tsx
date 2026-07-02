"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { QuizGate } from "@/components/QuizGate";
import { SurveyResultView } from "@/components/SurveyResultView";
import {
  useQuizData,
  getQuizzesByOwner,
  getGroupsByOwner,
  getSubmissions,
  getQuiz,
  saveSubmission,
  sumScore,
  needsAiGrading,
  displayName,
} from "@/lib/quizzes";
import type { Submission, Quiz, QuestionGrade } from "@/lib/types";
import s from "../quizzes.module.css";

export default function SubmissionsPage() {
  return (
    <QuizGate requireRole="counselor">
      <Submissions />
    </QuizGate>
  );
}

function Submissions() {
  const { user } = useAuth();
  const email = user!.email;
  const sync = useQuizData(() => Date.now());

  const quizzes = useMemo(() => getQuizzesByOwner(email), [email, sync]);
  const groups = useMemo(() => getGroupsByOwner(email), [email, sync]);
  const ownQuizIds = useMemo(() => new Set(quizzes.map((q) => q.id)), [quizzes]);
  const submissions = useMemo(
    () => getSubmissions().filter((sub) => ownQuizIds.has(sub.quizId) && sub.status !== "in_progress"),
    [ownQuizIds, sync]
  );

  const [quizFilter, setQuizFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selId, setSelId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const group = groups.find((g) => g.id === groupFilter);
    return submissions
      .filter((sub) => (quizFilter === "all" ? true : sub.quizId === quizFilter))
      .filter((sub) => (group ? group.studentEmails.includes(sub.studentEmail) : true))
      .sort((a, b) => ((b.submittedAt || "") > (a.submittedAt || "") ? 1 : -1));
  }, [submissions, quizFilter, groupFilter, groups]);

  const selected = filtered.find((x) => x.id === selId) || filtered[0];
  const selectedQuiz = selected ? getQuiz(selected.quizId) : undefined;

  if (submissions.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="Counselor" title="Submissions" lead="Review completed quizzes and finalize grades." />
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="award" size={24} /></span>
          <h3>No submissions yet</h3>
          <p className="muted">When assigned students complete a quiz, their submissions show up here for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader eyebrow="Counselor" title="Submissions" lead="Review answers, apply AI-assisted grades, and release results to students." />

      <div className={s.toolbar}>
        <label>
          <span className="field-label">Quiz</span>
          <select className="select" value={quizFilter} onChange={(e) => setQuizFilter(e.target.value)}>
            <option value="all">All quizzes</option>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
          </select>
        </label>
        {groups.length > 0 && (
          <label>
            <span className="field-label">Group</span>
            <select className="select" value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
              <option value="all">All students</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className={s.subGrid}>
        <div>
          {filtered.map((sub) => {
            const quiz = getQuiz(sub.quizId);
            return (
              <button
                key={sub.id}
                className={s.subItem}
                data-active={selected?.id === sub.id}
                onClick={() => setSelId(sub.id)}
              >
                <span className={s.subItemMain}>
                  <span className={s.subItemName}>{displayName(sub.studentEmail)}</span>
                  <span className={s.subItemMeta}>{quiz?.title} · {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ""}</span>
                </span>
                <span className={s.statusPill} data-status={sub.status === "graded" ? "graded" : "submitted"}>
                  {sub.result ? sub.result.label : sub.status === "graded" ? `${sub.score}/${sub.maxScore}` : "Review"}
                </span>
              </button>
            );
          })}
        </div>

        {selected && selectedQuiz ? (
          <ReviewPanel key={selected.id} submission={selected} quiz={selectedQuiz} />
        ) : (
          <div className={`${s.panel} surface`}><p className="muted">Select a submission to review.</p></div>
        )}
      </div>
    </div>
  );
}

function ReviewPanel({ submission, quiz }: { submission: Submission; quiz: Quiz }) {
  if (quiz.kind === "survey") return <SurveyReview submission={submission} quiz={quiz} />;
  return <QuizReview submission={submission} quiz={quiz} />;
}

function SurveyReview({ submission, quiz }: { submission: Submission; quiz: Quiz }) {
  return (
    <div className={`${s.review} surface`}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>{displayName(submission.studentEmail)}</span>
        <span className={s.statusPill} data-status="graded">Survey</span>
      </div>
      <SurveyResultView quiz={quiz} submission={submission} />
    </div>
  );
}

function QuizReview({ submission, quiz }: { submission: Submission; quiz: Quiz }) {
  const seed = useMemo<Record<string, QuestionGrade>>(() => {
    const map: Record<string, QuestionGrade> = {};
    quiz.questions.forEach((q) => {
      const g = submission.grades.find((x) => x.questionId === q.id);
      map[q.id] = g || { questionId: q.id, awarded: 0, max: q.points, autoGraded: false };
    });
    return map;
  }, [quiz, submission]);

  const [grades, setGrades] = useState<Record<string, QuestionGrade>>(seed);
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [aiBusy, setAiBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => { setGrades(seed); setFeedback(submission.feedback || ""); setSavedMsg(null); }, [seed, submission]);

  const answerText = (questionId: string) => {
    const a = submission.answers.find((x) => x.questionId === questionId);
    if (!a) return "";
    if (a.optionId) {
      const q = quiz.questions.find((x) => x.id === questionId);
      return q?.options?.find((o) => o.id === a.optionId)?.text ?? "";
    }
    return a.text || "";
  };

  const total = useMemo(() => sumScore(Object.values(grades)), [grades]);

  function setAwarded(qid: string, val: number, max: number) {
    setGrades((g) => ({ ...g, [qid]: { ...g[qid], awarded: Math.max(0, Math.min(max, val)) } }));
  }
  function setQFeedback(qid: string, fb: string) {
    setGrades((g) => ({ ...g, [qid]: { ...g[qid], feedback: fb } }));
  }

  async function runAi() {
    const items = quiz.questions
      .filter(needsAiGrading)
      .map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        max: q.points,
        rubric: q.rubric,
        reference: q.correctText,
        answer: answerText(q.id),
      }));
    if (items.length === 0) { setSavedMsg("No free-response questions to AI-grade."); return; }
    setAiBusy(true); setSavedMsg(null);
    try {
      const res = await fetch("/api/grade-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as { grades: { questionId: string; awarded: number; feedback: string }[]; source: string };
      setGrades((g) => {
        const next = { ...g };
        data.grades.forEach((r) => {
          if (next[r.questionId]) next[r.questionId] = { ...next[r.questionId], awarded: r.awarded, feedback: r.feedback, aiSuggested: true };
        });
        return next;
      });
      setSavedMsg(data.source === "openai" ? "AI suggested grades applied — review and adjust." : "AI grading unavailable; please grade manually.");
    } catch {
      setSavedMsg("AI grading failed. Please grade manually.");
    } finally {
      setAiBusy(false);
    }
  }

  function persist(status: "submitted" | "graded") {
    const gradeList = quiz.questions.map((q) => grades[q.id]);
    const updated: Submission = {
      ...submission,
      grades: gradeList,
      feedback: feedback.trim() || undefined,
      score: sumScore(gradeList),
      maxScore: submission.maxScore,
      status,
      gradedAt: status === "graded" ? new Date().toISOString() : submission.gradedAt,
    };
    saveSubmission(updated);
    setSavedMsg(status === "graded" ? "Grade finalized and released to the student." : "Draft grades saved.");
  }

  return (
    <div className={`${s.review} surface`}>
      <div className={s.panelHead}>
        <span className={s.panelTitle}>{displayName(submission.studentEmail)}</span>
        <span className={s.statusPill} data-status={submission.status === "graded" ? "graded" : "submitted"}>{submission.status}</span>
      </div>
      <div className={s.scoreSummary}>
        <span className={s.scoreBig}>{total}</span>
        <span className={s.scoreMax}>/ {submission.maxScore} points</span>
      </div>

      <div style={{ marginBottom: "0.6rem" }}>
        <button className="btn btn-ivy" onClick={runAi} disabled={aiBusy}>
          <Icon name="sparkle" size={15} /> {aiBusy ? "Grading…" : "AI-grade free responses"}
        </button>
      </div>

      {quiz.questions.map((q, i) => {
        const g = grades[q.id];
        const ans = answerText(q.id);
        const isChoice = q.type === "multiple_choice" || q.type === "true_false";
        const correctOpt = isChoice && q.correctOptionId ? q.options?.find((o) => o.id === q.correctOptionId)?.text : undefined;
        const isCorrect = g.autoGraded ? g.awarded >= q.points && q.points > 0 : undefined;
        return (
          <div key={q.id} className={s.reviewQ}>
            <div className={s.reviewPrompt}>{i + 1}. {q.prompt}</div>
            <div className={s.reviewAnswer} data-correct={isCorrect === undefined ? undefined : isCorrect}>
              {ans || <em className="muted">No answer</em>}
            </div>
            {correctOpt && <p className={s.keyLine}><Icon name="check" size={12} /> Answer key: {correctOpt}</p>}
            <div className={s.gradeRow}>
              <input
                className={`input ${s.pts}`}
                type="number"
                min={0}
                max={q.points}
                value={g.awarded}
                onChange={(e) => setAwarded(q.id, Number(e.target.value) || 0, q.points)}
                aria-label={`Points for question ${i + 1}`}
              />
              <span className="muted">/ {q.points} pts</span>
              {g.autoGraded && <span className={s.autoTag}>auto</span>}
              {g.aiSuggested && <span className={s.aiTag}>AI</span>}
            </div>
            {!isChoice && (
              <textarea
                className="input"
                rows={2}
                style={{ marginTop: "0.5rem" }}
                placeholder="Feedback for this answer (optional)"
                value={g.feedback || ""}
                onChange={(e) => setQFeedback(q.id, e.target.value)}
              />
            )}
          </div>
        );
      })}

      <div style={{ marginTop: "1.2rem" }}>
        <span className="field-label">Overall feedback (optional)</span>
        <textarea className="input" rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="A note to the student about their overall work" />
      </div>

      {savedMsg && <div className={s.savedNote} style={{ marginTop: "0.9rem" }}><Icon name="check" size={14} /> {savedMsg}</div>}

      <div className={s.saveBar}>
        <span className={s.grow} />
        <button className="btn btn-ghost" onClick={() => persist("submitted")}>Save draft</button>
        <button className="btn btn-primary" onClick={() => persist("graded")}>Finalize &amp; release <Icon name="arrow" size={16} /></button>
      </div>
    </div>
  );
}
