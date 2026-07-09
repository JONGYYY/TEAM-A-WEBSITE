"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useAuth } from "@/lib/auth";
import { listResumes, saveResume, getResumeFile, deleteResume, type ResumeMeta } from "@/lib/resumeStore";
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
  const { email } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refreshResumes = useCallback(() => {
    listResumes(email).then(setResumes);
  }, [email]);

  useEffect(() => { refreshResumes(); }, [refreshResumes]);

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

  async function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    // Remember the file so it can be re-imported later without re-uploading.
    const saved = await saveResume(email, file);
    if (saved) { setActiveId(saved.id); refreshResumes(); }
    const form = new FormData();
    form.append("file", file);
    form.append("target", target);
    send(form);
  }

  async function reuse(meta: ResumeMeta) {
    if (busy) return;
    const file = await getResumeFile(meta.id);
    if (!file) { setError("That saved résumé couldn't be opened. Please upload it again."); refreshResumes(); return; }
    setFileName(meta.name);
    setActiveId(meta.id);
    const form = new FormData();
    form.append("file", file);
    form.append("target", target);
    send(form);
  }

  async function remove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteResume(id);
    if (activeId === id) setActiveId(null);
    refreshResumes();
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
          ) : null}

          {mode === "upload" && resumes.length > 0 && (
            <div className={s.recent}>
              <span className={s.recentLabel}>Reuse a résumé you uploaded before</span>
              <div className={s.chipRow}>
                {resumes.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={s.chip}
                    data-active={activeId === r.id || undefined}
                    disabled={busy}
                    onClick={() => reuse(r)}
                    title={`Import from ${r.name}`}
                  >
                    <Icon name="book" size={14} />
                    <span className={s.chipMain}>
                      <span className={s.chipName}>{r.name}</span>
                      <span className={s.chipMeta}>{formatSize(r.size)} · {timeAgo(r.addedAt)}</span>
                    </span>
                    <span className={s.chipRemove} role="button" aria-label={`Remove ${r.name}`} onClick={(e) => remove(e, r.id)}>
                      <Icon name="x" size={13} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === "paste" && (
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(ts: number): string {
  const secs = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(ts).toLocaleDateString();
}
