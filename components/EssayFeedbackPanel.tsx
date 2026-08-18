"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import type { EssayPromptSnapshot, EssayScore, EssaySuggestion, EssaySuggestionStatus } from "@/lib/types";
import s from "@/app/essays/[id]/workspace.module.css";

interface Props {
  promptSnapshot: EssayPromptSnapshot;
  getEssayText: () => string;
  score: EssayScore | null | undefined;
  onScored: (score: EssayScore) => void;
  onJump: (text: string) => void;
  onApply: (find: string, replacement: string) => void;
}

function barColor(n: number): string {
  if (n >= 75) return "var(--grade-high)";
  if (n >= 50) return "var(--grade-mid)";
  return "var(--grade-low)";
}

function scoreBand(n: number): string {
  if (n >= 85) return "Excellent";
  if (n >= 70) return "Strong";
  if (n >= 55) return "Solid";
  if (n >= 40) return "Developing";
  return "Early draft";
}

/** Circular gauge for the overall score. */
function ScoreRing({ value }: { value: number }) {
  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circ * (1 - clamped / 100);
  return (
    <div className={s.ring} role="img" aria-label={`Overall score ${clamped} out of 100`}>
      <svg viewBox="0 0 72 72" width="72" height="72">
        <circle className={s.ringTrack} cx="36" cy="36" r={radius} strokeWidth="7" fill="none" />
        <circle
          className={s.ringFill}
          cx="36" cy="36" r={radius} strokeWidth="7" fill="none"
          stroke={barColor(clamped)}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className={s.ringVal} style={{ color: barColor(clamped) }}>{clamped}</div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function EssayFeedbackPanel({ promptSnapshot, getEssayText, score, onScored, onJump, onApply }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showResolved, setShowResolved] = useState(false);

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

  const suggestions = score?.suggestions ?? [];
  const openCount = useMemo(() => suggestions.filter((x) => (x.status ?? "open") === "open").length, [suggestions]);
  const visible = showResolved ? suggestions : suggestions.filter((x) => (x.status ?? "open") === "open");

  function setStatus(id: string, status: EssaySuggestionStatus) {
    if (!score) return;
    const next: EssayScore = {
      ...score,
      suggestions: (score.suggestions ?? []).map((x) => (x.id === id ? { ...x, status } : x)),
    };
    onScored(next);
  }

  function apply(sg: EssaySuggestion) {
    if (!sg.rewrite) return;
    onApply(sg.quote, sg.rewrite);
    setStatus(sg.id, "resolved");
  }

  if (!score) {
    return (
      <div className={s.fb}>
        <div className={s.fbEmpty}>
          <span className={s.emptyIcon}><Icon name="gauge" size={22} /></span>
          <h4>Structured feedback</h4>
          <p>Get a scored review across prompt fit, structure, clarity, voice, and impact — plus specific, line-by-line suggestions you can act on.</p>
          <button className="btn btn-primary" onClick={review} disabled={busy}>
            {busy ? <><span className={s.spinnerBtn} /> Analyzing…</> : <><Icon name="spark" size={16} /> Analyze my essay</>}
          </button>
          {err && <p className="field-needs" style={{ marginTop: "0.8rem" }}>{err}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={s.fb}>
      <div className={s.fbOverall}>
        <ScoreRing value={score.overall} />
        <div className={s.fbOverallMeta}>
          <h4>{scoreBand(score.overall)}</h4>
          <p>Analyzed {timeAgo(score.gradedAt)}</p>
        </div>
        <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "0.5rem 0.8rem" }} onClick={review} disabled={busy} aria-label="Re-analyze">
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

      {suggestions.length > 0 && (
        <div className={s.fbSugHead}>
          <h5>{openCount} suggestion{openCount === 1 ? "" : "s"}</h5>
          <button className={s.fbToggle} onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "Hide resolved" : "Show all"}
          </button>
        </div>
      )}

      {visible.map((sg) => {
        const status = sg.status ?? "open";
        return (
          <div key={sg.id} className={s.fbSug} data-status={status} data-sev={sg.severity}>
            <div className={s.fbSugTop}>
              <span className={s.fbSev} data-sev={sg.severity}>{sg.severity}</span>
              <span className={s.fbSugCat}>{sg.category}</span>
              {status !== "open" && <span className={s.fbSugState}>{status}</span>}
            </div>
            <button className={s.fbSugQuote} onClick={() => onJump(sg.quote)} title="Find in essay">
              <Icon name="quote" size={13} /> <span>{sg.quote}</span>
            </button>
            {sg.issue && <p className={s.fbSugIssue}>{sg.issue}</p>}
            {sg.fix && <p className={s.fbSugFix}><b>Try:</b> {sg.fix}</p>}
            {sg.rewrite && (
              <div className={s.fbSugRewrite}>
                <span className={s.fbSugRewriteLabel}>Suggested rewrite</span>
                <p>{sg.rewrite}</p>
              </div>
            )}
            <div className={s.fbSugActions}>
              {sg.rewrite && status !== "resolved" && (
                <button className={s.fbSugApply} onClick={() => apply(sg)}><Icon name="check" size={13} /> Apply</button>
              )}
              {status === "open" ? (
                <>
                  <button className={s.fbSugBtn} onClick={() => setStatus(sg.id, "resolved")}><Icon name="check" size={13} /> Resolve</button>
                  <button className={s.fbSugBtn} onClick={() => setStatus(sg.id, "ignored")}>Ignore</button>
                </>
              ) : (
                <button className={s.fbSugBtn} onClick={() => setStatus(sg.id, "open")}>Reopen</button>
              )}
            </div>
          </div>
        );
      })}

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
