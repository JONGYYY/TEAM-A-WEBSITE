"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { EssayComment } from "@/lib/types";
import s from "@/app/essays/[id]/workspace.module.css";

interface Props {
  comments: EssayComment[];
  pendingSelection: string;
  improving: boolean;
  clearPending: () => void;
  onAdd: (quotedText: string, body: string) => Promise<void> | void;
  onToggleResolved: (id: string, resolved: boolean) => void;
  onJump: (text: string) => void;
  onApply: (find: string, replacement: string) => void;
}

function parseAI(body: string): { rationale: string; suggestions: string[] } | null {
  try {
    const o = JSON.parse(body);
    if (o && (o.rationale || Array.isArray(o.suggestions))) {
      return { rationale: o.rationale || "", suggestions: Array.isArray(o.suggestions) ? o.suggestions : [] };
    }
  } catch {
    /* not JSON */
  }
  return null;
}

export function EssayCommentsPanel({ comments, pendingSelection, improving, clearPending, onAdd, onToggleResolved, onJump, onApply }: Props) {
  const [draft, setDraft] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pendingSelection) taRef.current?.focus();
  }, [pendingSelection]);

  async function add() {
    if (!draft.trim() && !pendingSelection) return;
    await onAdd(pendingSelection, draft.trim());
    setDraft("");
    clearPending();
  }

  return (
    <div className={s.cm}>
      <div className={s.cmList}>
        {comments.length === 0 && !improving && (
          <div className={s.cmEmpty}>
            Highlight a sentence in your essay to leave a note or get an AI suggestion. Comments stay pinned here until you resolve them.
          </div>
        )}
        {improving && (
          <div className={s.cmCard} data-kind="ai_feedback">
            <div className={s.cmTop}><span className={s.cmAuthor} data-ai="true">AI</span></div>
            <div className={s.cmBody}><span className={s.spinnerBtn} style={{ marginRight: 8 }} />Thinking through a stronger version…</div>
          </div>
        )}
        {comments.map((c) => {
          const ai = c.kind === "ai_feedback" ? parseAI(c.body) : null;
          return (
            <div key={c.id} className={s.cmCard} data-kind={c.kind} data-resolved={c.resolved}>
              <div className={s.cmTop}>
                <span className={s.cmAuthor} data-ai={c.author === "ai"}>{c.author === "ai" ? "AI" : "You"}</span>
                <button className={s.cmResolve} onClick={() => onToggleResolved(c.id, !c.resolved)}>
                  <Icon name={c.resolved ? "refresh" : "check"} size={13} />{c.resolved ? "Reopen" : "Resolve"}
                </button>
              </div>
              {c.quotedText && (
                <button type="button" className={s.cmQuote} onClick={() => onJump(c.quotedText)} title="Jump to this text in your essay">
                  <Icon name="quote" size={12} />
                  <span>{c.quotedText}</span>
                </button>
              )}
              {ai ? (
                <>
                  {ai.rationale && <div className={s.cmBody}>{ai.rationale}</div>}
                  {ai.suggestions.map((sug, i) => (
                    <div key={i} className={s.cmSuggestion}>
                      {sug}
                      <div><button className={s.cmApply} onClick={() => onApply(c.quotedText, sug)}><Icon name="check" size={13} /> Apply</button></div>
                    </div>
                  ))}
                </>
              ) : (
                <div className={s.cmBody}>{c.body}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className={s.cmComposer}>
        {pendingSelection && (
          <div className={s.cmQuoted}>
            <span>“{pendingSelection}”</span>
            <button onClick={clearPending} aria-label="Clear"><Icon name="x" size={14} /></button>
          </div>
        )}
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={pendingSelection ? "Add a note about the highlighted text…" : "Add a note (highlight text first to pin it to a line)…"}
        />
        <div className={s.cmComposerRow}>
          <button className="btn btn-primary" style={{ padding: "0.5rem 0.9rem" }} onClick={add} disabled={!draft.trim() && !pendingSelection}>
            <Icon name="quote" size={15} /> Add comment
          </button>
        </div>
      </div>
    </div>
  );
}
