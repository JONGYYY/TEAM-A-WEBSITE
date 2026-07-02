"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { QuizGate } from "@/components/QuizGate";
import { QuizImport } from "@/components/QuizImport";
import { QuestionEditor } from "@/components/QuestionEditor";
import { getQuiz, saveQuiz, uid } from "@/lib/quizzes";
import type { Question, QuestionType, Quiz, QuizKind, SurveyOutcome } from "@/lib/types";
import s from "../quizzes.module.css";

export default function BuildPage() {
  return (
    <QuizGate requireRole="counselor">
      <Builder />
    </QuizGate>
  );
}

function newQuestion(type: QuestionType = "multiple_choice"): Question {
  if (type === "multiple_choice") {
    return { id: uid("q"), type, prompt: "", points: 1, options: [{ id: uid("o"), text: "" }, { id: uid("o"), text: "" }] };
  }
  return { id: uid("q"), type, prompt: "", points: 1 };
}

function Builder() {
  const { user } = useAuth();
  const router = useRouter();

  const [editId] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null
  );
  const [kind, setKind] = useState<QuizKind>("quiz");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [outcomes, setOutcomes] = useState<SurveyOutcome[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSurvey = kind === "survey";

  useEffect(() => {
    if (!editId) return;
    let active = true;
    getQuiz(editId).then((q) => {
      if (!q || !active) return;
      setKind(q.kind || "quiz");
      setTitle(q.title);
      setDescription(q.description);
      setOutcomes(q.outcomes || []);
      setQuestions(q.questions);
      setCreatedAt(q.createdAt);
      setSavedId(q.id);
    });
    return () => { active = false; };
  }, [editId]);

  function onExtract(r: { kind?: QuizKind; title: string; outcomes?: SurveyOutcome[]; questions: Question[] }) {
    setQuestions((qs) => {
      if (qs.length === 0 && r.kind) setKind(r.kind);
      return [...qs, ...r.questions];
    });
    if (r.outcomes && r.outcomes.length) setOutcomes((prev) => (prev.length ? prev : r.outcomes!));
    setTitle((t) => t || r.title);
  }

  function updateQuestion(id: string, q: Question) {
    setQuestions((qs) => qs.map((x) => (x.id === id ? q : x)));
  }
  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((x) => x.id !== id));
  }
  function addQuestion(type: QuestionType) {
    setQuestions((qs) => [...qs, newQuestion(type)]);
  }

  function addOutcome() {
    setOutcomes((o) => [...o, { id: uid("out"), label: "", description: "" }]);
  }
  function updateOutcome(id: string, patch: Partial<SurveyOutcome>) {
    setOutcomes((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeOutcome(id: string) {
    setOutcomes((o) => o.filter((x) => x.id !== id));
    // unlink any option that pointed at it
    setQuestions((qs) => qs.map((q) => ({
      ...q,
      options: q.options?.map((op) => (op.outcomeId === id ? { ...op, outcomeId: undefined } : op)),
    })));
  }

  async function save(): Promise<string | null> {
    setError(null);
    const cleaned = questions
      .map((q) => ({ ...q, prompt: q.prompt.trim() }))
      .filter((q) => q.prompt);
    const cleanedOutcomes = outcomes.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label);

    if (!title.trim()) { setError(`Give your ${kind} a title.`); return null; }
    if (cleaned.length === 0) { setError("Add at least one question with a prompt."); return null; }
    if (isSurvey && cleanedOutcomes.length < 2) { setError("A survey needs at least 2 outcomes for scoring."); return null; }

    const now = new Date().toISOString();
    const id = savedId || uid("quiz");
    const quiz: Quiz = {
      id,
      ownerEmail: user!.email,
      title: title.trim(),
      description: description.trim(),
      kind,
      outcomes: isSurvey ? cleanedOutcomes : undefined,
      questions: cleaned,
      createdAt: createdAt || now,
      updatedAt: now,
    };
    await saveQuiz(quiz);
    setSavedId(id);
    setCreatedAt(quiz.createdAt);
    setQuestions(cleaned);
    setOutcomes(cleanedOutcomes);
    return id;
  }

  async function saveAndAssign() {
    const id = await save();
    if (id) router.push(`/quizzes/assignments?quiz=${id}`);
  }

  const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);
  const noun = isSurvey ? "survey" : "quiz";

  return (
    <div className="container">
      <PageHeader
        eyebrow={editId ? "Counselor · Edit" : "Counselor · New"}
        title="Quiz & Survey Builder"
        lead="Upload or paste a quiz or survey — we detect which it is — then fine-tune questions, outcomes, and scoring."
      />

      <QuizImport onExtract={onExtract} />

      <section className={`${s.panel} surface`}>
        <div className={s.kindToggle} role="radiogroup" aria-label="Type">
          {([
            { id: "quiz", label: "Quiz", hint: "Right/wrong answers · points" },
            { id: "survey", label: "Survey", hint: "No right answers · category result" },
          ] as const).map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              className={s.kindBtn}
              data-selected={kind === k.id}
              onClick={() => setKind(k.id)}
            >
              <span className={s.kindLabel}>{k.label}</span>
              <span className={s.kindHint}>{k.hint}</span>
            </button>
          ))}
        </div>

        <div className={s.metaGrid}>
          <label>
            <span className="field-label">{isSurvey ? "Survey" : "Quiz"} title</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isSurvey ? "e.g. Campus Size Preference" : "e.g. Junior Year Goals Check-in"} />
          </label>
          <label>
            <span className="field-label">Description / instructions (optional)</span>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to students before they start" />
          </label>
        </div>

        {isSurvey && (
          <div className={s.outcomeBox}>
            <div className={s.panelHead}>
              <span className={s.panelTitle}>Outcomes <span className="muted" style={{ fontWeight: 400, fontSize: "0.85rem" }}>· the result categories</span></span>
            </div>
            {outcomes.length === 0 ? (
              <p className="muted" style={{ marginBottom: "0.6rem" }}>Add the result categories (e.g. Large / Mid-size / Small campus), then map each answer choice to one.</p>
            ) : (
              <div className={s.outcomeList}>
                {outcomes.map((o, i) => (
                  <div key={o.id} className={s.outcomeRow}>
                    <span className={s.outcomeIdx}>{String.fromCharCode(65 + i)}</span>
                    <div className={s.outcomeFields}>
                      <input className="input" value={o.label} onChange={(e) => updateOutcome(o.id, { label: e.target.value })} placeholder="Outcome label (e.g. Large Campus Explorer)" />
                      <textarea className="input" rows={2} value={o.description} onChange={(e) => updateOutcome(o.id, { description: e.target.value })} placeholder="What this result means for the student" />
                    </div>
                    <button type="button" className={s.iconBtnInline} onClick={() => removeOutcome(o.id)} aria-label="Remove outcome"><Icon name="x" size={15} /></button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className={s.addOption} onClick={addOutcome}><Icon name="spark" size={13} /> Add outcome</button>
          </div>
        )}

        <div className={s.panelHead}>
          <span className={s.panelTitle}>
            {questions.length} question{questions.length === 1 ? "" : "s"}
            {!isSurvey && <span className="muted" style={{ fontWeight: 400, fontSize: "0.85rem" }}> · {totalPoints} pts total</span>}
          </span>
        </div>

        {questions.length === 0 ? (
          <div className={s.empty} style={{ marginBottom: "1rem" }}>
            <span className={s.emptyIcon}><Icon name="spark" size={24} /></span>
            <h3>No questions yet</h3>
            <p className="muted">Import a file above, or add a question manually.</p>
          </div>
        ) : (
          <div className={s.qList}>
            {questions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                index={i}
                kind={kind}
                outcomes={outcomes}
                onChange={(nq) => updateQuestion(q.id, nq)}
                onRemove={() => removeQuestion(q.id)}
              />
            ))}
          </div>
        )}

        <div className={s.addQuestionRow}>
          <button className="btn btn-ghost" onClick={() => addQuestion("multiple_choice")}><Icon name="spark" size={15} /> Add multiple choice</button>
          <button className="btn btn-ghost" onClick={() => addQuestion("true_false")}>Add true / false</button>
          {!isSurvey && <button className="btn btn-ghost" onClick={() => addQuestion("short_answer")}>Add short answer</button>}
          {!isSurvey && <button className="btn btn-ghost" onClick={() => addQuestion("long_answer")}>Add long answer</button>}
        </div>

        {error && <div className={s.formError}><Icon name="warning" size={14} /> {error}</div>}

        <div className={s.saveBar}>
          {savedId && <span className={s.savedNote}><Icon name="check" size={14} /> Saved</span>}
          <span className={s.grow} />
          {savedId && (
            <Link href={`/quizzes/preview/${savedId}`} className="btn btn-ghost">
              <Icon name="user" size={15} /> Preview as student
            </Link>
          )}
          <button className="btn btn-ghost" onClick={() => save()}>Save</button>
          <button className="btn btn-primary" onClick={saveAndAssign}>Save &amp; assign <Icon name="arrow" size={16} /></button>
        </div>
      </section>
    </div>
  );
}
