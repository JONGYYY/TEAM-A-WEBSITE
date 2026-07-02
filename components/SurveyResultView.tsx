"use client";

import type { Quiz, Submission } from "@/lib/types";
import s from "@/app/quizzes/quizzes.module.css";

/**
 * Read-only view of one student's survey result: winning outcome, per-outcome
 * tally bars, and their answer to each question. Shared by the submissions and
 * results pages.
 */
export function SurveyResultView({ quiz, submission }: { quiz: Quiz; submission: Submission }) {
  const r = submission.result;
  const maxCount = Math.max(1, ...(r?.counts.map((c) => c.count) || [1]));

  const answerText = (questionId: string) => {
    const a = submission.answers.find((x) => x.questionId === questionId);
    if (!a) return "";
    if (a.optionId) {
      return quiz.questions.find((x) => x.id === questionId)?.options?.find((o) => o.id === a.optionId)?.text ?? "";
    }
    return a.text || "";
  };

  return (
    <div>
      {r && (
        <>
          <div className={s.surveyResultHead}>
            <span className="eyebrow">Result</span>
            <h2 className={s.reviewResultLabel}>{r.label}</h2>
            {r.description && <p className="muted" style={{ marginTop: "0.3rem" }}>{r.description}</p>}
          </div>
          <div className={s.tallyList} style={{ marginBottom: "1.2rem" }}>
            {r.counts.map((c) => (
              <div key={c.outcomeId} className={s.tallyRow} data-win={c.outcomeId === r.outcomeId}>
                <span className={s.tallyLabel}>{c.label}</span>
                <span className={s.tallyTrack}><span className={s.tallyFill} style={{ width: `${(c.count / maxCount) * 100}%` }} /></span>
                <span className={s.tallyCount}>{c.count}</span>
              </div>
            ))}
          </div>
        </>
      )}
      <span className="field-label">Responses</span>
      {quiz.questions.map((q, i) => (
        <div key={q.id} className={s.reviewQ}>
          <div className={s.reviewPrompt}>{i + 1}. {q.prompt}</div>
          <div className={s.reviewAnswer}>{answerText(q.id) || <em className="muted">No answer</em>}</div>
        </div>
      ))}
    </div>
  );
}
