"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { PLAN_BY_GRADE, type PlanItem } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";

const TYPE_META: Record<PlanItem["type"], { icon: string; label: string }> = {
  course: { icon: "book", label: "Course" },
  activity: { icon: "spark", label: "Activity" },
  test: { icon: "gauge", label: "Test" },
  summer: { icon: "globe", label: "Summer" },
  milestone: { icon: "flag", label: "Milestone" },
};

export default function Planner() {
  const { profile, hydrated } = useStore();
  const [status, setStatus] = useState<"draft" | "active" | "review">("active");
  const [done, setDone] = useState<Record<string, boolean>>({});
  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const grade = profile.intake.grade ?? 11;
  const grades = [9, 10, 11, 12];

  return (
    <div className="container">
      <PageHeader eyebrow="Career Planning · Plan" title="My 4-Year Planner" lead="Your roadmap from freshman year to applications. It auto-calibrates as your profile grows." />

      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "1.6rem", flexWrap: "wrap", alignItems: "center" }}>
        <span className="tag-mono" style={{ borderColor: status === "active" ? "var(--ivy-bright)" : undefined, color: status === "active" ? "var(--ivy-bright)" : undefined }}>
          {status === "active" ? "★ Active plan" : status === "draft" ? "Draft" : "In review"}
        </span>
        <button className="btn btn-ghost" style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }} onClick={() => alert("Recalibrating against your latest profile…")}>
          <Icon name="spark" size={14} /> Run my recalibration
        </button>
        <button className="btn btn-ghost" style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }} onClick={() => setStatus("review")}>
          <Icon name="user" size={14} /> Send for counselor review
        </button>
        <button className="btn btn-ghost" style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem" }} onClick={() => window.print()}>
          <Icon name="arrow" size={14} /> Export PDF
        </button>
      </div>

      <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "1rem" }}>
        {grades.map((g) => {
          const items = PLAN_BY_GRADE[g];
          const current = g === grade;
          return (
            <motion.div key={g} variants={riseItem} className="surface" style={{ padding: "1.4rem", borderColor: current ? "var(--marigold)" : undefined }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0 }}>Grade {g}</h3>
                {current && <span className="tag-mono" style={{ color: "var(--marigold-deep)", borderColor: "var(--marigold)" }}>You are here</span>}
                {g < grade && <span className="tag-mono">Past</span>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {items.map((it, i) => {
                  const key = `${g}-${i}`;
                  const m = TYPE_META[it.type];
                  return (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.7rem", cursor: "pointer" }}>
                      <input type="checkbox" checked={!!done[key]} onChange={(e) => setDone((d) => ({ ...d, [key]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--ivy)" }} />
                      <span style={{ color: "var(--ivy-bright)", display: "inline-flex" }}><Icon name={m.icon} size={15} /></span>
                      <span style={{ fontSize: "0.9rem", color: done[key] ? "var(--ink-faint)" : "var(--ink)", textDecoration: done[key] ? "line-through" : "none", flex: 1 }}>{it.label}</span>
                      <span className="tag-mono" style={{ fontSize: "0.58rem" }}>{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
