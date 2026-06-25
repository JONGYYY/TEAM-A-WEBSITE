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
  const [note, setNote] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState(false);
  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const grade = profile.intake.grade ?? 11;
  const grades = [9, 10, 11, 12];

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2600);
  }

  function recalibrate() {
    setRecalibrating(true);
    flash("Recalibrated against your latest profile.");
    setTimeout(() => setRecalibrating(false), 900);
  }

  function downloadJSON() {
    const plan = {
      student: `${profile.basic.firstName} ${profile.basic.lastName}`.trim() || "Student",
      grade,
      status,
      generatedAt: new Date().toISOString(),
      years: grades.map((g) => ({
        grade: g,
        items: PLAN_BY_GRADE[g].map((it, i) => ({ ...it, done: !!done[`${g}-${i}`] })),
      })),
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dreamcollege-4-year-plan.json";
    a.click();
    URL.revokeObjectURL(url);
    flash("Plan downloaded as JSON.");
  }

  const aBtn = { padding: "0.45rem 0.9rem", fontSize: "0.85rem" } as const;

  return (
    <div className="container">
      <PageHeader eyebrow="Career Planning · Plan" title="My 4-Year Planner" lead="Your roadmap from freshman year to applications. It auto-calibrates as your profile grows." />

      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "0.9rem", flexWrap: "wrap", alignItems: "center" }}>
        <button
          className="tag-mono"
          onClick={() => setStatus((s) => (s === "active" ? "draft" : "active"))}
          title="Toggle plan status"
          style={{ cursor: "pointer", background: "transparent", borderColor: status === "active" ? "var(--ivy-bright)" : undefined, color: status === "active" ? "var(--ivy-bright)" : undefined }}
        >
          {status === "active" ? "★ Active plan" : status === "draft" ? "Draft — click to activate" : "In review"}
        </button>
        <button className="btn btn-ghost" style={aBtn} onClick={recalibrate} disabled={recalibrating}>
          <Icon name="spark" size={14} /> {recalibrating ? "Recalibrating…" : "Run my recalibration"}
        </button>
        <button className="btn btn-ghost" style={aBtn} onClick={() => { setStatus("review"); flash("Sent to your counselor for review."); }}>
          <Icon name="user" size={14} /> Send for counselor review
        </button>
        <button className="btn btn-ghost" style={aBtn} onClick={() => flash("Opening scheduling — pick a slot with your counselor.")}>
          <Icon name="calendar" size={14} /> Book an appointment
        </button>
        <button className="btn btn-ghost" style={aBtn} onClick={() => window.print()}>
          <Icon name="arrow" size={14} /> Export PDF
        </button>
        <button className="btn btn-ghost" style={aBtn} onClick={downloadJSON}>
          <Icon name="arrow" size={14} /> Download JSON
        </button>
      </div>

      <div style={{ minHeight: "1.4rem", marginBottom: "1rem" }}>
        {note && (
          <motion.span
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            className="mono"
            style={{ fontSize: "0.8rem", color: "var(--ivy-bright)", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Icon name="check" size={14} /> {note}
          </motion.span>
        )}
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
