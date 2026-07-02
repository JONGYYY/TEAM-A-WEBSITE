"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import type { Question, QuizKind, SurveyOutcome } from "@/lib/types";
import s from "./QuizImport.module.css";

export interface QuizExtractResult { kind?: QuizKind; title: string; outcomes?: SurveyOutcome[]; questions: Question[]; source: string }

export function QuizImport({ onExtract }: { onExtract: (r: QuizExtractResult) => void }) {
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function send(body: FormData | string) {
    setBusy(true); setError(null); setStatus(null);
    try {
      const res = await fetch("/api/extract-quiz", {
        method: "POST",
        ...(typeof body === "string"
          ? { headers: { "Content-Type": "application/json" }, body }
          : { body }),
      });
      const data = (await res.json()) as QuizExtractResult;
      const n = data.questions?.length || 0;
      if (n === 0) {
        setError(
          data.source === "empty"
            ? "Couldn't read any questions from that. Use a PDF or Word (.docx), or switch to “Paste text”."
            : "Couldn't find questions here. Try the “Paste text” tab or add questions manually below."
        );
      } else {
        onExtract(data);
        const kindLabel = data.kind === "survey" ? "survey" : "quiz";
        setStatus(`Detected a ${kindLabel} · imported ${n} question${n === 1 ? "" : "s"}${data.source === "heuristic" ? " (offline mode — set types & answers below)" : ""} — review and edit below.`);
      }
    } catch {
      setError("Something went wrong. Please try again or add questions manually.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    send(form);
  }

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <span className={s.icon}><Icon name="sparkle" size={18} /></span>
        <div className={s.headText}>
          <strong>Import questions</strong>
          <span className={s.sub}>Upload a PDF or Word (.docx) quiz, or paste text — AI turns it into editable questions.</span>
        </div>
      </div>

      <div className={s.body}>
        <div className={s.tabs}>
          <button type="button" className={s.tab} data-on={mode === "upload"} onClick={() => setMode("upload")}>Upload file</button>
          <button type="button" className={s.tab} data-on={mode === "paste"} onClick={() => setMode("paste")}>Paste text</button>
        </div>

        {mode === "upload" ? (
          <div
            className={s.drop}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] ?? null); }}
          >
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            <Icon name="sparkle" size={20} />
            <span>{fileName ? fileName : "Click to upload or drop a PDF, Word (.docx), or .txt quiz"}</span>
          </div>
        ) : (
          <div>
            <textarea
              className="input"
              rows={7}
              placeholder="Paste your quiz or survey questions here…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="btn btn-ivy"
              style={{ marginTop: "0.6rem" }}
              disabled={busy || text.trim().length < 10}
              onClick={() => send(JSON.stringify({ text }))}
            >
              {busy ? "Reading…" : "Extract with AI"}
            </button>
          </div>
        )}

        {busy && <div className={s.status}><span className={s.spinner} /> Reading your quiz…</div>}
        {status && <div className={s.ok}><Icon name="check" size={14} /> {status}</div>}
        {error && <div className={s.err}><Icon name="warning" size={14} /> {error}</div>}
      </div>
    </div>
  );
}
