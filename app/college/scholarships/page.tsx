"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useLocal } from "@/lib/useLocal";
import { SCHOLARSHIPS } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";

interface Shortlist { colleges: string[]; scholarships: string[] }

export default function Scholarships() {
  const { profile, hydrated } = useStore();
  const [list, setList, lHydrated] = useLocal<Shortlist>("dc.shortlist", { colleges: [], scholarships: [] });
  const [sort, setSort] = useState<"fit" | "deadline" | "amount">("fit");
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

  const save = (name: string) =>
    setList((s) => ({ ...s, scholarships: s.scholarships.includes(name) ? s.scholarships.filter((x) => x !== name) : [...s.scholarships, name] }));

  return (
    <div className="container">
      <PageHeader eyebrow="College Planning · Scholarships" title="Matched Scholarships" lead="Funding matched to your profile. Match scores rise as you complete first-gen, income, and interest details." />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.4rem", alignItems: "center" }}>
        <span className="eyebrow" style={{ marginRight: "0.4rem" }}>Sort</span>
        {(["fit", "deadline", "amount"] as const).map((o) => (
          <button key={o} className="chip" data-selected={sort === o} onClick={() => setSort(o)} style={{ textTransform: "capitalize" }}>{o}</button>
        ))}
      </div>

      {!profile.basic.incomeOptIn && (
        <div className="privacy-note" style={{ marginBottom: "1.4rem", borderStyle: "solid" }}>
          <Icon name="shield" size={16} />
          <span>Opt in to share income context in your profile to unlock need-based matches — it stays on your device.</span>
        </div>
      )}

      <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
        {sorted.map(({ sc, match }) => (
          <motion.div key={sc.name} variants={riseItem} className={p.listRow}>
            <div style={{ flex: 1 }}>
              <div className={p.rowName}>{sc.name}</div>
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
      </motion.div>
    </div>
  );
}
