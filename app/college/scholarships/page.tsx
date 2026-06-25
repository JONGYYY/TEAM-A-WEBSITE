"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useUserLocal } from "@/lib/useLocal";
import { SCHOLARSHIPS } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";


const PAGE_SIZE = 8;

interface Shortlist { colleges: string[]; scholarships: string[] }

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function Scholarships() {
  const { profile, hydrated } = useStore();
  const [list, setList, lHydrated] = useUserLocal<Shortlist>("shortlist", { colleges: [], scholarships: [] });
  const [sort, setSort] = useState<"fit" | "deadline" | "amount">("fit");
  const [seed, setSeed] = useState(1);
  const [spinning, setSpinning] = useState(false);

  if (!hydrated || !lHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const firstGen = /^Yes/.test(profile.basic.firstGen);
  const lowIncome = profile.basic.incomeOptIn && /Less than|\$10,000|\$30,000/.test(profile.basic.familyIncomeBand);
  const stem = profile.preference.interests.some((i) => ["Engineering", "Computer Technologies", "Science", "Math and Statistics"].includes(i));

  const scored = SCHOLARSHIPS.map((sc) => {
    let match = 55;
    if (firstGen && sc.tags.includes("first-gen")) match += 22;
    if (lowIncome && sc.tags.includes("need")) match += 18;
    if (stem && (sc.tags.includes("stem") || sc.tags.includes("engineering"))) match += 16;
    if (sc.tags.includes("academic")) match += 8;
    return { sc, match: Math.min(98, match) };
  });

  const sorted = [...scored].sort((a, b) => {
    if (sort === "fit") return b.match - a.match;
    if (sort === "deadline") return a.sc.deadline.localeCompare(b.sc.deadline);
    return b.sc.amount.length - a.sc.amount.length;
  });

  // When re-generating, keep top 4 by fit and shuffle the rest to surface new picks
  const top4 = [...scored].sort((a, b) => b.match - a.match).slice(0, 4);
  const rest = scored.filter((x) => !top4.includes(x));
  const shuffledRest = seededShuffle(rest, seed);
  const visible = sort === "fit"
    ? [...top4, ...shuffledRest].slice(0, PAGE_SIZE)
    : sorted.slice(0, PAGE_SIZE);

  function regenerate() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
    setSeed((s) => s + 1);
  }


  const save = (name: string) =>
    setList((s) => ({ ...s, scholarships: s.scholarships.includes(name) ? s.scholarships.filter((x) => x !== name) : [...s.scholarships, name] }));

  return (
    <div className="container">
      <PageHeader eyebrow="College Planning · Scholarships" title="Matched Scholarships" lead="Funding matched to your profile. Match scores rise as you complete first-gen, income, and interest details." />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.4rem", alignItems: "center", flexWrap: "wrap" }}>
        <span className="eyebrow" style={{ marginRight: "0.4rem" }}>Sort</span>
        {(["fit", "deadline", "amount"] as const).map((o) => (
          <button key={o} className="chip" data-selected={sort === o} onClick={() => setSort(o)} style={{ textTransform: "capitalize" }}>{o}</button>
        ))}
        <button
          className="btn btn-ghost"
          onClick={regenerate}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.35rem 0.8rem" }}
        >
          <span style={{ display: "inline-block", transition: "transform 0.6s", transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }}>↺</span>
          Regenerate
        </button>
      </div>

      {!profile.basic.incomeOptIn && (
        <div className="privacy-note" style={{ marginBottom: "1.4rem", borderStyle: "solid" }}>
          <Icon name="shield" size={16} />
          <span>Opt in to share income context in your profile to unlock need-based matches — it stays on your device.</span>
        </div>
      )}

      <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        <AnimatePresence mode="popLayout">
          {visible.map(({ sc, match }) => (
            <motion.div key={sc.name + seed} variants={riseItem} layout className={p.listRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={sc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={p.rowName}
                  style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                >
                  {sc.name}
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
                    <path d="M3.5 1H11M11 1V8.5M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <div className={p.rowSub}>{sc.basis} · {sc.effort} effort</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 110 }}>
                <div style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>{sc.amount}</div>
                <div className="mono" style={{ fontSize: "0.7rem", color: "var(--clay)" }}>{sc.deadline}</div>
              </div>
              <span className="mono" style={{ color: "var(--ivy-bright)", minWidth: 48, textAlign: "right" }}>{match}%</span>
              <button className={p.saveBtn} data-saved={list.scholarships.includes(sc.name)} onClick={() => save(sc.name)} aria-label="Save">
                <Icon name="bookmark" size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
