"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import type { EssayPromptSnapshot, EssayScore } from "@/lib/types";
import s from "@/app/essays/[id]/workspace.module.css";

interface Props {
  promptSnapshot: EssayPromptSnapshot;
  getEssayText: () => string;
  score: EssayScore | null | undefined;
  onScored: (score: EssayScore) => void;
}

function barColor(n: number): string {
  if (n >= 75) return "var(--ivy)";
  if (n >= 50) return "var(--marigold)";
  return "var(--clay)";
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function EssayFeedbackPanel({ promptSnapshot, getEssayText, score, onScored }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function review() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/essay/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptSnapshot, essayText: getEssayText() }),
      });
      const data = (await res.json()) as { score?: EssayScore };
      if (data.score) onScored(data.score);
      else setErr("Couldn't generate feedback. Please try again.");
    } catch {
      setErr("Couldn't reach the review service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!score) {
    return (
      <div className={s.fb}>
        <div className={s.fbEmpty}>
          <span className={s.emptyIcon}><Icon name="gauge" size={22} /></span>
          <h4>Structured feedback</h4>
          <p>Get a scored review across prompt fit, structure, clarity, voice, and impact — with specific ways to improve.</p>
          <button className="btn btn-primary" onClick={review} disabled={busy}>
            {busy ? <><span className={s.spinnerBtn} /> Reviewing…</> : <><Icon name="spark" size={16} /> Review my essay</>}
          </button>
          {err && <p className="field-needs" style={{ marginTop: "0.8rem" }}>{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={s.fb}>
      <div className={s.fbOverall}>
        <div className={s.fbScore}>{score.overall}<small>/100</small></div>
        <div className={s.fbOverallMeta}>
          <h4>Overall</h4>
          <p>Reviewed {timeAgo(score.gradedAt)}</p>
        </div>
        <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "0.5rem 0.8rem" }} onClick={review} disabled={busy} aria-label="Re-review">
          {busy ? <span className={s.spinnerBtn} /> : <Icon name="refresh" size={16} />}
        </button>
      </div>

      {score.categories.map((c) => (
        <div key={c.key} className={s.fbCat}>
          <div className={s.fbCatTop}><b>{c.label}</b><span>{c.score}</span></div>
          <div className={s.fbBar}><div className={s.fbFill} style={{ width: `${c.score}%`, background: barColor(c.score) }} /></div>
          {c.note && <div className={s.fbNote}>{c.note}</div>}
        </div>
      ))}

      {score.strengths.length > 0 && (
        <div className={`${s.fbBlock} ${s.fbGood}`}>
          <h5>What&apos;s working</h5>
          <ul>{score.strengths.map((x, i) => <li key={i}><Icon name="check" size={15} />{x}</li>)}</ul>
        </div>
      )}
      {score.improvements.length > 0 && (
        <div className={`${s.fbBlock} ${s.fbWork}`}>
          <h5>Where to improve</h5>
          <ul>{score.improvements.map((x, i) => <li key={i}><Icon name="arrow" size={15} />{x}</li>)}</ul>
        </div>
      )}
      {err && <p className="field-needs">{err}</p>}
    </div>
  );
}
