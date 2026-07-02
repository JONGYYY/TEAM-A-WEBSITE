"use client";

import { Icon } from "./Icon";
import { uid } from "@/lib/quizzes";
import type { Question, QuestionType, QuestionOption, QuizKind, SurveyOutcome } from "@/lib/types";
import s from "./QuestionEditor.module.css";

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short answer" },
  { value: "long_answer", label: "Long answer" },
];

export function QuestionEditor({
  question,
  index,
  kind = "quiz",
  outcomes = [],
  onChange,
  onRemove,
}: {
  question: Question;
  index: number;
  kind?: QuizKind;
  outcomes?: SurveyOutcome[];
  onChange: (q: Question) => void;
  onRemove: () => void;
}) {
  const q = question;
  const isSurvey = kind === "survey";
  const patch = (p: Partial<Question>) => onChange({ ...q, ...p });

  function changeType(type: QuestionType) {
    if (type === "true_false") {
      patch({
        type,
        options: [
          { id: uid("o"), text: "True" },
          { id: uid("o"), text: "False" },
        ],
        correctOptionId: undefined,
        correctText: undefined,
      });
    } else if (type === "multiple_choice") {
      const options = q.options && q.options.length >= 2 ? q.options : [
        { id: uid("o"), text: "" },
        { id: uid("o"), text: "" },
      ];
      patch({ type, options, correctText: undefined });
    } else {
      patch({ type, options: undefined, correctOptionId: undefined });
    }
  }

  function setOption(id: string, text: string) {
    patch({ options: (q.options || []).map((o) => (o.id === id ? { ...o, text } : o)) });
  }
  function setOptionOutcome(id: string, outcomeId: string) {
    patch({ options: (q.options || []).map((o) => (o.id === id ? { ...o, outcomeId: outcomeId || undefined } : o)) });
  }
  function addOption() {
    patch({ options: [...(q.options || []), { id: uid("o"), text: "" }] });
  }
  function removeOption(id: string) {
    const options = (q.options || []).filter((o) => o.id !== id);
    patch({ options, correctOptionId: q.correctOptionId === id ? undefined : q.correctOptionId });
  }

  const isChoice = q.type === "multiple_choice" || q.type === "true_false";

  return (
    <div className={s.card}>
      <div className={s.head}>
        <span className={s.num}>Q{index + 1}</span>
        <select className={`select ${s.typeSelect}`} value={q.type} onChange={(e) => changeType(e.target.value as QuestionType)}>
          {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className={s.spacer} />
        {!isSurvey && (
          <label className={s.ptsWrap}>
            <input
              className={`input ${s.points}`}
              type="number"
              min={0}
              value={q.points}
              onChange={(e) => patch({ points: Math.max(0, Number(e.target.value) || 0) })}
              aria-label="Points"
            />
            <span className={s.ptsLabel}>pts</span>
          </label>
        )}
        <button type="button" className={s.iconBtn} onClick={onRemove} aria-label={`Remove question ${index + 1}`}>
          <Icon name="x" size={16} />
        </button>
      </div>

      <textarea
        className="input"
        rows={2}
        placeholder="Question prompt…"
        value={q.prompt}
        onChange={(e) => patch({ prompt: e.target.value })}
      />

      {isChoice && (
        <div className={s.options}>
          {(q.options || []).map((o: QuestionOption) => (
            <div key={o.id} className={s.optionRow}>
              {isSurvey ? (
                <select
                  className={`select ${s.outcomeSelect}`}
                  value={o.outcomeId || ""}
                  onChange={(e) => setOptionOutcome(o.id, e.target.value)}
                  aria-label="Maps to outcome"
                >
                  <option value="">— outcome —</option>
                  {outcomes.map((out) => <option key={out.id} value={out.id}>{out.label || "Untitled"}</option>)}
                </select>
              ) : (
                <button
                  type="button"
                  className={s.correctToggle}
                  data-on={q.correctOptionId === o.id}
                  onClick={() => patch({ correctOptionId: q.correctOptionId === o.id ? undefined : o.id })}
                  title="Mark as the correct answer"
                >
                  <Icon name="check" size={13} /> {q.correctOptionId === o.id ? "Correct" : "Mark"}
                </button>
              )}
              <input
                className="input"
                placeholder="Answer choice…"
                value={o.text}
                onChange={(e) => setOption(o.id, e.target.value)}
                disabled={q.type === "true_false"}
              />
              {q.type === "multiple_choice" && (q.options?.length || 0) > 2 && (
                <button type="button" className={s.iconBtn} onClick={() => removeOption(o.id)} aria-label="Remove choice">
                  <Icon name="x" size={14} />
                </button>
              )}
            </div>
          ))}
          {q.type === "multiple_choice" && (
            <button type="button" className={s.addOption} onClick={addOption}>
              <Icon name="spark" size={13} /> Add choice
            </button>
          )}
          <p className={s.keyHint}>
            {isSurvey
              ? "Map each choice to the outcome it counts toward. The most-chosen outcome becomes the student's result."
              : "Optional: mark a correct answer to enable auto-grading. Leave unmarked for manual review."}
          </p>
        </div>
      )}

      {!isSurvey && q.type === "short_answer" && (
        <div className={s.keyBox}>
          <span className="field-label">Answer key (optional)</span>
          <input
            className="input"
            placeholder="Exact expected answer — enables auto-grading"
            value={q.correctText || ""}
            onChange={(e) => patch({ correctText: e.target.value })}
          />
          <p className={s.keyHint}>If set, an exact (case-insensitive) match scores full points. Leave blank for AI-assisted grading.</p>
        </div>
      )}

      {!isSurvey && q.type === "long_answer" && (
        <div className={s.keyBox}>
          <span className="field-label">Grading rubric / guidance (optional)</span>
          <textarea
            className="input"
            rows={2}
            placeholder="What a strong answer should include — guides AI-assisted grading"
            value={q.rubric || ""}
            onChange={(e) => patch({ rubric: e.target.value })}
          />
          <p className={s.keyHint}>Long answers are graded with AI assistance; you review and adjust before finalizing.</p>
        </div>
      )}
    </div>
  );
}
