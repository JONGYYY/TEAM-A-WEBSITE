"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getEssay, saveEssay, getComments, addComment, setCommentResolved, onEssayChange } from "@/lib/essays";
import { summarizeProfileForEssay, isReviewStatus, statusLabel } from "@/lib/essayContent";
import { EssayEditor, type EssayEditorHandle } from "@/components/EssayEditor";
import { EssayChatPanel } from "@/components/EssayChatPanel";
import { EssayFeedbackPanel } from "@/components/EssayFeedbackPanel";
import { EssayCommentsPanel } from "@/components/EssayCommentsPanel";
import { Icon } from "@/components/Icon";
import type { Essay, EssayComment, EssayPart, EssayScore, EssayStatus } from "@/lib/types";
import s from "./workspace.module.css";

type SideTab = "chat" | "feedback" | "comments";

const STATUS_OPTS: { id: EssayStatus; label: string }[] = [
  { id: "draft", label: statusLabel("draft") },
  { id: "in_progress", label: statusLabel("in_progress") },
  { id: "in_review", label: statusLabel("in_review") },
  { id: "reviewed", label: statusLabel("reviewed") },
  { id: "archived", label: statusLabel("archived") },
];

export default function EssayWorkspacePage() {
  return (
    <Suspense fallback={<div className={s.wrap}><div style={{ gridColumn: "1 / -1", minHeight: "50vh" }} /></div>}>
      <EssayWorkspace />
    </Suspense>
  );
}

function EssayWorkspace() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get("tab");
  const { user, email, hydrated } = useAuth();
  const { profile } = useStore();

  const [essay, setEssay] = useState<Essay | null | undefined>(undefined);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  const [sideTab, setSideTab] = useState<SideTab>("chat");
  const initialTabApplied = useRef(false);
  const [selection, setSelection] = useState("");
  const [comments, setComments] = useState<EssayComment[]>([]);
  const [pendingComment, setPendingComment] = useState("");
  const [improving, setImproving] = useState(false);
  const [outlining, setOutlining] = useState(false);

  const essayRef = useRef<Essay | null>(null);
  const textRef = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstEditorChange = useRef(true);
  const editorRef = useRef<EssayEditorHandle>(null);

  useEffect(() => {
    if (!hydrated || !id) return;
    let active = true;
    getEssay(id).then((e) => {
      if (!active) return;
      essayRef.current = e ?? null;
      setEssay(e ?? null);
    });
    return () => { active = false; };
  }, [hydrated, id]);

  // Open reviews straight to Feedback (or honor an explicit ?tab=).
  useEffect(() => {
    if (initialTabApplied.current || !essay) return;
    initialTabApplied.current = true;
    if (tabParam === "feedback" || tabParam === "comments" || tabParam === "chat") {
      setSideTab(tabParam);
    } else if (isReviewStatus(essay.status)) {
      setSideTab("feedback");
    }
  }, [essay, tabParam]);

  const reloadComments = useCallback(() => {
    if (id) getComments(id).then(setComments);
  }, [id]);

  useEffect(() => {
    if (!hydrated || !id) return;
    reloadComments();
    return onEssayChange(reloadComments);
  }, [hydrated, id, reloadComments]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      if (essayRef.current) await saveEssay(essayRef.current);
      setSaveState("saved");
    }, 800);
  }, []);

  const patch = useCallback((p: Partial<Essay>, { save = true } = {}) => {
    setEssay((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...p };
      essayRef.current = next;
      return next;
    });
    if (save) scheduleSave();
  }, [scheduleSave]);

  const onEditorChange = useCallback((json: unknown, text: string, words: number) => {
    textRef.current = text;
    if (firstEditorChange.current) {
      firstEditorChange.current = false;
      patch({ content: json, wordCount: words }, { save: false });
      return;
    }
    const cur = essayRef.current;
    const bump = cur?.status === "draft" && words > 0 ? { status: "in_progress" as EssayStatus } : {};
    patch({ content: json, wordCount: words, ...bump });
  }, [patch]);

  function togglePart(partId: string) {
    if (!essay) return;
    const parts: EssayPart[] = essay.parts.map((p) => (p.id === partId ? { ...p, done: !p.done } : p));
    patch({ parts });
  }

  const onScored = useCallback((score: EssayScore) => { patch({ score }); }, [patch]);

  // "Improve" from the selection toolbar → AI rewrite as an AI comment.
  const improve = useCallback(async (text: string) => {
    if (!text.trim() || !essayRef.current) return;
    setSideTab("comments");
    setImproving(true);
    try {
      const res = await fetch("/api/essay/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: essayRef.current.promptSnapshot, selection: text, essayText: textRef.current }),
      });
      const data = (await res.json()) as { rationale?: string; suggestions?: string[] };
      await addComment({
        essayId: essayRef.current.id,
        author: "ai",
        kind: "ai_feedback",
        quotedText: text,
        rangeFrom: null,
        rangeTo: null,
        body: JSON.stringify({ rationale: data.rationale || "", suggestions: data.suggestions || [] }),
      });
      reloadComments();
    } finally {
      setImproving(false);
    }
  }, [reloadComments]);

  const addNote = useCallback(async (quoted: string, body: string) => {
    if (!essayRef.current) return;
    await addComment({ essayId: essayRef.current.id, author: email, kind: "comment", quotedText: quoted, rangeFrom: null, rangeTo: null, body });
    reloadComments();
  }, [email, reloadComments]);

  const toggleResolved = useCallback((cid: string, resolved: boolean) => {
    setComments((prev) => prev.map((c) => (c.id === cid ? { ...c, resolved } : c)));
    setCommentResolved(cid, resolved);
  }, []);

  const applySuggestion = useCallback((find: string, replacement: string) => {
    const ok = editorRef.current?.replace(find, replacement);
    if (!ok) alert("Couldn't find that text — it may have changed since the suggestion was made.");
  }, []);

  const jumpTo = useCallback((text: string) => { editorRef.current?.jumpTo(text); }, []);

  const commentOnSelection = useCallback((text: string) => {
    setPendingComment(text);
    setSideTab("comments");
  }, []);

  const generateOutline = useCallback(async () => {
    if (!essayRef.current) return;
    setOutlining(true);
    try {
      const res = await fetch("/api/essay/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: essayRef.current.promptSnapshot, essayText: textRef.current }),
      });
      const data = (await res.json()) as { parts?: { label: string; hint: string }[] };
      if (data.parts && data.parts.length) {
        const parts: EssayPart[] = data.parts.map((p, i) => ({ id: `ai_${i}_${Date.now().toString(36)}`, label: p.label, hint: p.hint, done: false }));
        patch({ parts });
      }
    } finally {
      setOutlining(false);
    }
  }, [patch]);

  // ---- render guards ----
  if (!hydrated || essay === undefined) {
    return <div className={s.wrap}><div style={{ gridColumn: "1 / -1", minHeight: "50vh" }} /></div>;
  }
  if (!user) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p>Please <Link href="/dashboard?auth=login">sign in</Link> to open this essay.</p>
      </div>
    );
  }
  if (!essay || essay.ownerEmail !== email) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
        <h3>Essay not found</h3>
        <p className="muted">It may have been deleted, or it belongs to another account.</p>
        <Link href="/essays" className="btn btn-ghost"><span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" size={16} /></span> Back to Essay Studio</Link>
      </div>
    );
  }

  const snap = essay.promptSnapshot;

  return (
    <div className={s.wrap}>
      <div className={s.topbar}>
        <Link href="/essays" className={s.backLink}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" size={16} /></span> Studio
        </Link>
        <input
          className={s.titleInput}
          value={essay.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Untitled essay"
          aria-label="Essay title"
        />
        <div className={s.topActions}>
          <span className={s.saveState}>{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}</span>
          {(essay.status === "draft" || essay.status === "in_progress") && (
            <button className="btn btn-primary" style={{ padding: "0.45rem 0.8rem" }} onClick={() => { patch({ status: "in_review" }); setSideTab("feedback"); }}>
              <Icon name="gauge" size={15} /> Submit for review
            </button>
          )}
          {essay.status === "in_review" && (
            <button className="btn btn-primary" style={{ padding: "0.45rem 0.8rem" }} onClick={() => patch({ status: "reviewed" })}>
              <Icon name="check" size={15} /> Mark reviewed
            </button>
          )}
          <select
            style={{ fontFamily: "var(--font-ui)", fontSize: "0.85rem", padding: "0.4rem 0.55rem", border: "1px solid var(--hairline-strong)", borderRadius: "var(--r-md)", background: "var(--paper)", color: "var(--ink)" }}
            value={essay.status === "final" ? "reviewed" : essay.status}
            onChange={(e) => patch({ status: e.target.value as EssayStatus })}
            aria-label="Essay status"
          >
            {STATUS_OPTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Left rail: prompt + outline */}
      <aside className={s.rail}>
        <div className={s.railCard}>
          <h4>Prompt</h4>
          {snap.college ? (
            <div className={s.promptCollege}>{snap.college}</div>
          ) : (
            <div className={s.promptCollege}>{snap.source === "common_app" ? "Common App" : "Custom prompt"}</div>
          )}
          {snap.major && <div className={s.promptMajor}>{snap.major}</div>}
          <p className={s.promptText}>{snap.promptText}</p>
          <div className={s.promptMeta}>
            {snap.wordLimit && <span className="tag-mono">{snap.wordLimit} words</span>}
            <span className="tag-mono">{snap.year}</span>
          </div>
        </div>

        <div className={s.railCard}>
          <h4>Outline</h4>
          <div className={s.partsList}>
            {essay.parts.map((p) => (
              <button key={p.id} className={s.part} data-done={p.done} onClick={() => togglePart(p.id)}>
                <span className={s.partCheck}>{p.done && <Icon name="check" size={12} />}</span>
                <span>
                  <span className={s.partLabel}>{p.label}</span>
                  <span className={s.partHint}> — {p.hint}</span>
                </span>
              </button>
            ))}
          </div>
          <div className={s.railActions}>
            <button className={s.railBtn} onClick={generateOutline} disabled={outlining}>
              {outlining ? <span className={s.spinnerBtn} /> : <Icon name="spark" size={14} />} AI outline
            </button>
          </div>
        </div>
      </aside>

      {/* Center: editor */}
      <main>
        <EssayEditor
          ref={editorRef}
          initialContent={essay.content}
          placeholder={`Answer: ${snap.promptText.slice(0, 80)}${snap.promptText.length > 80 ? "…" : ""}`}
          wordLimit={snap.wordLimit}
          onChange={onEditorChange}
          onSelection={setSelection}
          onAskCoach={() => setSideTab("chat")}
          onComment={commentOnSelection}
          onImprove={improve}
        />
      </main>

      {/* Right: assistant */}
      <aside className={s.side}>
        <div className={s.sideTabs} role="tablist">
          <button role="tab" aria-selected={sideTab === "chat"} className={s.sideTab} data-active={sideTab === "chat"} onClick={() => setSideTab("chat")}><Icon name="sparkle" size={15} /> Coach</button>
          <button role="tab" aria-selected={sideTab === "feedback"} className={s.sideTab} data-active={sideTab === "feedback"} onClick={() => setSideTab("feedback")}><Icon name="gauge" size={15} /> Feedback</button>
          <button role="tab" aria-selected={sideTab === "comments"} className={s.sideTab} data-active={sideTab === "comments"} onClick={() => setSideTab("comments")}>
            <Icon name="quote" size={15} /> Comments{comments.filter((c) => !c.resolved).length > 0 ? ` (${comments.filter((c) => !c.resolved).length})` : ""}
          </button>
        </div>
        {/* All three panels stay mounted; we only toggle visibility so a
            streaming Coach reply is never cancelled by switching tabs. */}
        <div className={s.sideBody}>
          <div style={{ display: sideTab === "chat" ? "contents" : "none" }}>
            <EssayChatPanel
              essayId={essay.id}
              ownerEmail={email}
              promptSnapshot={snap}
              getEssayText={() => textRef.current}
              selection={selection}
              clearSelection={() => setSelection("")}
              profileSummary={summarizeProfileForEssay(profile)}
            />
          </div>
          <div style={{ display: sideTab === "feedback" ? "contents" : "none" }}>
            <EssayFeedbackPanel
              promptSnapshot={snap}
              getEssayText={() => textRef.current}
              score={essay.score}
              onScored={onScored}
              onJump={jumpTo}
              onApply={applySuggestion}
            />
          </div>
          <div style={{ display: sideTab === "comments" ? "contents" : "none" }}>
            <EssayCommentsPanel
              comments={comments}
              pendingSelection={pendingComment}
              improving={improving}
              clearPending={() => setPendingComment("")}
              onAdd={addNote}
              onToggleResolved={toggleResolved}
              onJump={jumpTo}
              onApply={applySuggestion}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
