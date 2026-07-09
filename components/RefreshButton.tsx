"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { notifyQuizChange } from "@/lib/quizzes";
import s from "./RefreshButton.module.css";

/**
 * Manually re-pulls accounts + quiz data from Supabase. Useful right after a
 * student signs up so the counselor sees them without waiting on live updates.
 */
export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const [spinning, setSpinning] = useState(false);

  function refresh() {
    if (spinning) return;
    setSpinning(true);
    notifyQuizChange();
    setTimeout(() => setSpinning(false), 700);
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={refresh} aria-label="Refresh">
      <span className={spinning ? s.spin : undefined} style={{ display: "inline-flex" }}>
        <Icon name="refresh" size={15} />
      </span>
      {label}
    </button>
  );
}
