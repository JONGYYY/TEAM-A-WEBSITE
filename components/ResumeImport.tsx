"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import type { Award, Activity } from "@/lib/types";
import s from "./ResumeImport.module.css";

type Target = "awards" | "activities" | "all";

interface ExtractResult { awards: Award[]; activities: Activity[]; source: string }

export function ResumeImport({
  target,
  label,
  onExtract,
}: {
  target: Target;
  label: string;
  onExtract: (r: ExtractResult) => void;
}) {
  const [open, setOpen] = useState(false);
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
      const res = await fetch("/api/extract-resume", {
        method: "POST",
        ...(typeof body === "string"
          ? { headers: { "Content-Type": "application/json" }, body }
          : { body }),
      });
      const data = (await res.json()) as ExtractResult;
      const n = (data.awards?.length || 0) + (data.activities?.length || 0);
      if (n === 0) {
        setError(
          data.source === "empty"
            ? "Couldn't read that file. Use a PDF or Word (.docx) — older .doc files aren't supported — or switch to “Paste text”."
            : "Couldn't find anything to import here. Try the “Paste text” tab or add items manually below."
        );
      } else {
        onExtract(data);
        const parts = [];
        if (data.awards?.length) parts.push(`${data.awards.length} award${data.awards.length > 1 ? "s" : ""}`);
        if (data.activities?.length) parts.push(`${data.activities.length} activit${data.activities.length > 1 ? "ies" : "y"}`);
        setStatus(`Imported ${parts.join(" and ")}${data.source === "heuristic" ? " (offline mode)" : ""} — review and edit below.`);
      }
    } catch {
      setError("Something went wrong. Please try again or enter items manually.");
    } finally {
      setBusy(false);
    }
  }

  function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    form.append("target", target);
    send(form);
  }

  return (
    <div className={s.wrap}>
      <button type="button" className={s.head} onClick={() => setOpen((o) => !o)}>
        <span className={s.icon}><Icon name="sparkle" size={18} /></span>
        <div className={s.headText}>
          <strong>{label}</strong>
          <span className={s.sub}>Upload a PDF or Word (.docx) résumé, or paste text — AI fills these in for you to review.</span>
        </div>
        <Icon name={open ? "check" : "arrow"} size={16} />
      </button>

      {open && (
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
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                hidden
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              <Icon name="sparkle" size={20} />
              <span>{fileName ? fileName : "Click to upload or drop a PDF, Word (.docx), or .txt résumé"}</span>
            </div>
          ) : (
            <div>
              <textarea
                className="input"
                rows={6}
                placeholder="Paste your résumé or activity list here…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                className="btn btn-ivy"
                style={{ marginTop: "0.6rem" }}
                disabled={busy || text.trim().length < 10}
                onClick={() => send(JSON.stringify({ text, target }))}
              >
                {busy ? "Reading…" : "Extract with AI"}
              </button>
            </div>
          )}

          {busy && <div className={s.status}><span className={s.spinner} /> Reading your résumé…</div>}
          {status && <div className={s.ok}><Icon name="check" size={14} /> {status}</div>}
          {error && <div className={s.err}><Icon name="warning" size={14} /> {error}</div>}
        </div>
      )}
    </div>
  );
}
