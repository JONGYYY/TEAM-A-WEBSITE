"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { QUIZ } from "@/lib/content";
import { useUserLocal } from "@/lib/useLocal";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { easeOut } from "@/lib/motion";

const LIKERT = [
  { v: 1, label: "Not me" },
  { v: 2, label: "Rarely" },
  { v: 3, label: "Neutral" },
  { v: 4, label: "Often" },
  { v: 5, label: "So me" },
];

export default function CareerDiscovery() {
  const [, setCareer] = useUserLocal<{ pillars: Record<string, number>; completedAt: string } | null>("career", null);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const router = useRouter();

  const q = QUIZ[idx];
  const progress = (idx / QUIZ.length) * 100;

  function answer(v: number) {
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    if (idx + 1 >= QUIZ.length) finish(next);
    else setTimeout(() => setIdx((i) => i + 1), 180);
  }

  // Keyboard support: press 1–5 to answer the current question.
  useEffect(() => {
    if (!started) return;
    function onKey(e: KeyboardEvent) {
      const n = Number(e.key);
      if (n >= 1 && n <= 5) { e.preventDefault(); answer(n); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, idx, answers]);

  function finish(final: Record<string, number>) {
    const pillars: Record<string, number> = { investigate: 0, create: 0, lead: 0, serve: 0 };
    QUIZ.forEach((qq) => { pillars[qq.pillar] += final[qq.id] ?? 0; });
    setCareer({ pillars, completedAt: new Date().toISOString() });
    router.push("/career/fit-report");
  }

  if (!started) {
    return (
      <div className="container">
        <PageHeader eyebrow="Career Planning · Discover" title="Career Discovery Quiz" lead="Twelve quick gut-checks. No right answers — we map you to your best-fit career tracks." />
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: easeOut }} className="surface" style={{ padding: "2rem", maxWidth: 560 }}>
          <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.2rem", flexWrap: "wrap" }}>
            {["Investigate", "Create", "Lead", "Serve"].map((p) => <span key={p} className="tag-mono">{p}</span>)}
          </div>
          <p style={{ marginBottom: "1.4rem" }}>We measure four pillars and match them against six career tracks. Takes about a minute.</p>
          <button className="btn btn-primary" onClick={() => setStarted(true)}>Start Quiz <Icon name="arrow" size={16} /></button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <span className="eyebrow">Question {idx + 1} of {QUIZ.length}</span>
          <div style={{ marginTop: "0.6rem", height: 4, borderRadius: 999, background: "var(--hairline)", overflow: "hidden" }}>
            <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: easeOut }} style={{ height: "100%", background: "linear-gradient(90deg,var(--ivy-bright),var(--marigold))", borderRadius: 999 }} />
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3, ease: easeOut }}>
            <h2 style={{ marginBottom: "2rem", minHeight: "3em" }}>{q.text}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "0.6rem" }}>
              {LIKERT.map((l) => (
                <button
                  key={l.v}
                  onClick={() => answer(l.v)}
                  className="surface"
                  style={{ padding: "1rem 0.4rem", cursor: "pointer", textAlign: "center", border: answers[q.id] === l.v ? "1px solid var(--ivy)" : undefined, display: "flex", flexDirection: "column", gap: "0.3rem", alignItems: "center" }}
                >
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--ink)" }}>{l.v}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-faint)" }}>{l.label}</span>
                </button>
              ))}
            </div>
            <p className="field-hint" style={{ textAlign: "center", marginTop: "1.2rem" }}>
              Tip: press <strong>1–5</strong> on your keyboard to answer fast.
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
