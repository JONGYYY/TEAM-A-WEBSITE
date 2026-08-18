"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { Combobox, type ComboOption } from "@/components/Combobox";
import { createEssay, saveEssay } from "@/lib/essays";
import { COMMON_COLLEGES, currentCycle, defaultParts, hasExtracurriculars, textToDoc } from "@/lib/essayContent";
import type { Essay, EssayPromptSnapshot, EssayScore } from "@/lib/types";
import s from "../essays.module.css";

type Mode = "upload" | "paste";

async function searchColleges(query: string): Promise<ComboOption[]> {
  const q = query.trim().toLowerCase();
  const curated: ComboOption[] = COMMON_COLLEGES.filter((name) => name.toLowerCase().includes(q))
    .slice(0, 8)
    .map((name) => ({ value: name, label: name }));
  let api: ComboOption[] = [];
  try {
    const res = await fetch(`/api/colleges?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      api = (data.colleges ?? []).map((c: { name: string; country: string; region: string }) => ({
        value: c.name, label: c.name, hint: [c.region, c.country].filter(Boolean).join(", "),
      }));
    }
  } catch { /* curated still shows */ }
  const seen = new Set(curated.map((c) => c.value.toLowerCase()));
  return [...curated, ...api.filter((a) => !seen.has(a.value.toLowerCase()))];
}

export default function EssayReview() {
  const router = useRouter();
  const { user, email, hydrated } = useAuth();
  const { profile, setProfile, hydrated: storeHydrated } = useStore();

  const [mode, setMode] = useState<Mode>("upload");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [pasted, setPasted] = useState("");
  const [college, setCollege] = useState("");
  const [essayType, setEssayType] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [dragging, setDragging] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!hydrated || !storeHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  if (!user) {
    return (
      <div className="container">
        <PageHeader eyebrow="Essays · Review" title="Upload an essay for review" />
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="lock" size={24} /></span>
          <h3>Sign in to get a review</h3>
          <p>Reviews save to your account alongside your drafts and AI chats.</p>
          <Link href="/dashboard?auth=login" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  function goToProfile(step: number) {
    setProfile((p) => ({ ...p, meta: { ...p.meta, lastStep: step } }));
    router.push("/college/profile");
  }

  if (!hasExtracurriculars(profile)) {
    return (
      <div className="container">
        <PageHeader eyebrow="Essays · Review" title="One quick step first" />
        <div className={s.gateCard}>
          <span className={s.gateIcon}><Icon name="award" size={28} /></span>
          <h2>Add your extracurriculars first</h2>
          <p>Feedback is grounded in who you are. Add your activities so your review can weigh how well the essay reflects your real story.</p>
          <div className={s.gateActions}>
            <button className="btn btn-primary" onClick={() => goToProfile(6)}><Icon name="award" size={16} /> Add extracurriculars</button>
            <button className="btn btn-ghost" onClick={() => goToProfile(1)}><Icon name="upload" size={16} /> Upload a résumé</button>
          </div>
        </div>
      </div>
    );
  }

  async function handleFile(file: File) {
    setErr("");
    setFileName(file.name);
    setExtracting(true);
    setExtractedText("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/essay/extract", { method: "POST", body: fd });
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.text && data.text.trim().length >= 40) {
        setExtractedText(data.text);
      } else {
        setErr(data.error || "Couldn't read enough text from that file. Try pasting the essay instead.");
      }
    } catch {
      setErr("Couldn't read that file. Try pasting the essay instead.");
    } finally {
      setExtracting(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  const text = mode === "paste" ? pasted : extractedText;
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const canSubmit = text.trim().length >= 40 && !creating && !extracting;

  async function submit() {
    const body = text.trim();
    if (body.length < 40) { setErr("Add at least a few sentences to review."); return; }
    setCreating(true);
    setErr("");

    const label = essayType.trim() || (college.trim() ? `${college.trim()} essay` : "Personal statement");
    const snapshot: EssayPromptSnapshot = {
      college: college.trim(),
      major: null,
      year: currentCycle(),
      promptText: essayType.trim() || "Uploaded essay for review",
      wordLimit: wordLimit ? Number(wordLimit) || null : null,
      source: "user",
    };

    const { essay, error } = await createEssay({
      ownerEmail: email,
      title: label,
      promptSnapshot: snapshot,
      parts: defaultParts(),
      status: "in_review",
      content: textToDoc(body),
      wordCount,
    });

    if (!essay) {
      setCreating(false);
      setErr(
        /relation .* does not exist|schema cache|could not find the table|status/i.test(error || "")
          ? "The essay tables (or review statuses) aren't set up in Supabase yet. Run supabase/essays_migration.sql and supabase/essays_review_migration.sql, then try again."
          : error || "Could not create the review. Please try again."
      );
      return;
    }

    // Best-effort: grade immediately so the review opens with a score.
    try {
      const res = await fetch("/api/essay/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: snapshot, essayText: body }),
      });
      const data = (await res.json()) as { score?: EssayScore };
      if (data.score) {
        const scored: Essay = { ...essay, score: data.score };
        await saveEssay(scored);
      }
    } catch { /* the workspace can still analyze on demand */ }

    router.push(`/essays/${essay.id}?tab=feedback`);
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow="Essays · Review"
        title="Upload an essay for review"
        lead="Drop in an essay you've already written and get a scored review with specific, line-by-line suggestions."
      />

      <div className={s.aiNote} role="note">
        <Icon name="info" size={16} />
        <span>Reviews are feedback only — the AI points out what to strengthen and why, but never rewrites your essay for you.</span>
      </div>

      <div className={s.segmented} role="tablist" aria-label="Input method">
        <button role="tab" aria-selected={mode === "upload"} className={s.segBtn} data-active={mode === "upload"} onClick={() => setMode("upload")}>Upload a file</button>
        <button role="tab" aria-selected={mode === "paste"} className={s.segBtn} data-active={mode === "paste"} onClick={() => setMode("paste")}>Paste text</button>
      </div>

      <div className={s.panel}>
        {mode === "upload" ? (
          <>
            <div
              className={s.dropzone}
              data-active={dragging}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
              aria-label="Upload essay file"
            >
              <span className={s.dropIcon}><Icon name={extracting ? "clock" : "upload"} size={26} /></span>
              {extracting ? (
                <p><b>Reading {fileName}…</b></p>
              ) : extractedText ? (
                <p><b>{fileName}</b><br /><span className="field-hint">{wordCount} words extracted — click to replace.</span></p>
              ) : (
                <>
                  <p><b>Drop your essay here</b> or click to browse</p>
                  <span className="field-hint">PDF, Word (.docx), or plain text</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </>
        ) : (
          <div className="field">
            <label className="field-label" htmlFor="paste">Your essay</label>
            <textarea
              id="paste"
              className="input"
              style={{ minHeight: 220 }}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste your full essay here…"
            />
            <span className="field-hint">{wordCount} words</span>
          </div>
        )}

        <div className={s.divider}>Optional details</div>
        <div className={s.row2}>
          <div className="field">
            <label className="field-label">College (optional)</label>
            <Combobox value={college} onChange={setCollege} getOptions={searchColleges} placeholder="Which school is this for?" allowFreeText />
          </div>
          <div className="field">
            <label className="field-label">Essay type (optional)</label>
            <input className="input" value={essayType} onChange={(e) => setEssayType(e.target.value)} placeholder="e.g. Common App Personal Essay" />
          </div>
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <label className="field-label">Word limit (optional)</label>
          <input className="input" inputMode="numeric" value={wordLimit} onChange={(e) => setWordLimit(e.target.value.replace(/[^0-9]/g, ""))} placeholder="650" />
        </div>

        {err && <div className={`${s.notice} ${s.noticeErr}`}><Icon name="warning" size={16} /> <span>{err}</span></div>}

        <div className={s.footerBar}>
          <Link href="/essays" className="btn btn-ghost">Cancel</Link>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            {creating ? <><span className={s.spinner} /> Creating review…</> : <><Icon name="gauge" size={16} /> Get my review</>}
          </button>
        </div>
      </div>
    </div>
  );
}
