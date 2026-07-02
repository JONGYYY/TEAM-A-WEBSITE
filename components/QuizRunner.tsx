"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { stepVariants, easeOut } from "@/lib/motion";
import type { Quiz, Question, Answer } from "@/lib/types";
import s from "./QuizRunner.module.css";

const FOCUS_THRESHOLD = 5; // > this many questions => one-at-a-time focus mode

export function QuizRunner({
  quiz,
  mode,
  initialAnswers,
  onSubmit,
  submitting,
}: {
  quiz: Quiz;
  mode: "take" | "preview";
  initialAnswers?: Answer[];
  onSubmit?: (answers: Answer[]) => void;
  submitting?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const seed: Record<string, Answer> = {};
    (initialAnswers || []).forEach((a) => { seed[a.questionId] = a; });
    return seed;
  });

  const focus = quiz.questions.length > FOCUS_THRESHOLD;
  const total = quiz.questions.length;
  const isSurvey = quiz.kind === "survey";
  const [idx, setIdx] = useState(0); // in focus mode, idx === total means the review screen
  const [dir, setDir] = useState(1);
  const isPreview = mode === "preview";

  const setChoice = (qid: string, optionId: string) =>
    setAnswers((a) => ({ ...a, [qid]: { questionId: qid, optionId } }));
  const setText = (qid: string, text: string) =>
    setAnswers((a) => ({ ...a, [qid]: { questionId: qid, text } }));

  const isAnswered = (q: Question) => {
    const a = answers[q.id];
    if (!a) return false;
    if (q.type === "multiple_choice" || q.type === "true_false") return !!a.optionId;
    return !!a.text && a.text.trim().length > 0;
  };
  const answeredCount = useMemo(() => quiz.questions.filter(isAnswered).length, [answers, quiz]);
  const progress = total ? Math.round((answeredCount / total) * 100) : 0;

  function go(next: number) {
    setDir(next > idx ? 1 : -1);
    setIdx(Math.max(0, Math.min(total, next)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    if (isPreview || !onSubmit) return;
    onSubmit(quiz.questions.map((q) => answers[q.id] ?? { questionId: q.id }));
  }

  return (
    <div className={s.wrap}>
      {isPreview && (
        <div className={s.previewBanner}>
          <Icon name="user" size={15} /> Previewing as a student — answers are not saved.
        </div>
      )}

      <div className={s.intro}>
        <span className="eyebrow">{focus ? `Question-by-question · ${total} total` : `${total} question${total === 1 ? "" : "s"}`}</span>
        <h1 className={s.title}>{quiz.title}</h1>
        {quiz.description && <p className={s.desc}>{quiz.description}</p>}
        {focus && (
          <div className={s.progressTrack}>
            <motion.div className={s.progressFill} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: easeOut }} />
          </div>
        )}
      </div>

      {focus ? (
        <FocusMode
          quiz={quiz}
          idx={idx}
          dir={dir}
          answers={answers}
          answeredCount={answeredCount}
          isAnswered={isAnswered}
          setChoice={setChoice}
          setText={setText}
          go={go}
          submit={submit}
          submitting={submitting}
          isPreview={isPreview}
        />
      ) : (
        <div className={s.list}>
          {quiz.questions.map((q, i) => (
            <QuestionCard key={q.id} q={q} index={i} answer={answers[q.id]} setChoice={setChoice} setText={setText} hidePoints={isSurvey} />
          ))}
          <div className={s.footer}>
            <span className={s.footerInfo}>{answeredCount}/{total} answered</span>
            <span style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={submit} disabled={isPreview || submitting}>
              {submitting ? "Submitting…" : isPreview ? "Submit (disabled in preview)" : isSurvey ? "See my result" : "Submit quiz"} <Icon name="check" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- focus mode -------------------------------- */

function FocusMode({
  quiz, idx, dir, answers, answeredCount, isAnswered, setChoice, setText, go, submit, submitting, isPreview,
}: {
  quiz: Quiz; idx: number; dir: number; answers: Record<string, Answer>; answeredCount: number;
  isAnswered: (q: Question) => boolean;
  setChoice: (qid: string, optionId: string) => void; setText: (qid: string, text: string) => void;
  go: (n: number) => void; submit: () => void; submitting?: boolean; isPreview: boolean;
}) {
  const total = quiz.questions.length;
  const onReview = idx >= total;
  const isSurvey = quiz.kind === "survey";

  return (
    <div className={s.focusBox}>
      <AnimatePresence mode="wait" custom={dir}>
        {!onReview ? (
          <motion.div key={idx} variants={stepVariants} initial="enter" animate="center" exit="exit" className={s.focusCard}>
            <span className={s.focusCount}>Question {idx + 1} of {total}</span>
            <QuestionCard q={quiz.questions[idx]} index={idx} answer={answers[quiz.questions[idx].id]} setChoice={setChoice} setText={setText} bare hidePoints={isSurvey} />
          </motion.div>
        ) : (
          <motion.div key="review" variants={stepVariants} initial="enter" animate="center" exit="exit" className={s.focusCard}>
            <span className={s.focusCount}>Review</span>
            <h2 className={s.reviewTitle}>You answered {answeredCount} of {total}</h2>
            <div className={s.reviewGrid}>
              {quiz.questions.map((q, i) => (
                <button key={q.id} className={s.reviewChip} data-done={isAnswered(q)} onClick={() => go(i)}>
                  <span>{i + 1}</span>
                  <Icon name={isAnswered(q) ? "check" : "arrow"} size={12} />
                </button>
              ))}
            </div>
            {answeredCount < total && <p className={s.reviewWarn}>Unanswered questions will be marked blank. You can still submit.</p>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={s.footer}>
        <button className="btn btn-ghost" onClick={() => go(idx - 1)} disabled={idx === 0}>
          <Icon name="arrow" size={16} className={s.flip} /> Back
        </button>
        <span style={{ flex: 1 }} />
        {!onReview ? (
          <button className="btn btn-primary" onClick={() => go(idx + 1)}>
            {idx === total - 1 ? "Review" : "Next"} <Icon name="arrow" size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={submit} disabled={isPreview || submitting}>
            {submitting ? "Submitting…" : isPreview ? "Submit (disabled in preview)" : isSurvey ? "See my result" : "Submit quiz"} <Icon name="check" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ question card ------------------------------ */

function QuestionCard({
  q, index, answer, setChoice, setText, bare, hidePoints,
}: {
  q: Question; index: number; answer?: Answer;
  setChoice: (qid: string, optionId: string) => void; setText: (qid: string, text: string) => void;
  bare?: boolean; hidePoints?: boolean;
}) {
  return (
    <div className={bare ? s.qBare : s.qCard}>
      <div className={s.qPrompt}>
        {!bare && <span className={s.qNum}>{index + 1}</span>}
        <span>{q.prompt || <em className="muted">Untitled question</em>}</span>
        {!hidePoints && q.points ? <span className={s.qPts}>{q.points} pt{q.points === 1 ? "" : "s"}</span> : null}
      </div>

      {(q.type === "multiple_choice" || q.type === "true_false") && (
        <div className={s.choices}>
          {(q.options || []).map((o) => (
            <button
              key={o.id}
              type="button"
              className={s.choice}
              data-selected={answer?.optionId === o.id}
              onClick={() => setChoice(q.id, o.id)}
            >
              <span className={s.radio} aria-hidden />
              <span>{o.text}</span>
            </button>
          ))}
        </div>
      )}

      {q.type === "short_answer" && (
        <input className="input" placeholder="Your answer…" value={answer?.text || ""} onChange={(e) => setText(q.id, e.target.value)} />
      )}

      {q.type === "long_answer" && (
        <textarea className="input" rows={5} placeholder="Write your response…" value={answer?.text || ""} onChange={(e) => setText(q.id, e.target.value)} />
      )}
    </div>
  );
}
