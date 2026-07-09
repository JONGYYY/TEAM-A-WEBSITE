"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useUserLocal } from "@/lib/useLocal";
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

interface TrackAddition { trackId: string; trackName: string; courses: string[] }

export default function Planner() {
  const { profile, hydrated } = useStore();
  const [status, setStatus] = useState<"draft" | "active" | "review">("active");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);
  const [recalibrating, setRecalibrating] = useState(false);
  const [trackAdd, setTrackAdd, taHydrated] = useUserLocal<TrackAddition | null>("plannerTrack", null);
  if (!hydrated || !taHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const grade = profile.intake.grade ?? 11;
  const grades = [9, 10, 11, 12];

  // Courses added from a Career Track that aren't already part of the base plan.
  const existingLabels = new Set(grades.flatMap((g) => PLAN_BY_GRADE[g].map((it) => it.label.toLowerCase())));
  const trackCourses = (trackAdd?.courses ?? []).filter((c) => !existingLabels.has(c.toLowerCase()));

  function flash(msg: string) {
    setNote(msg);
    setTimeout(() => setNote(null), 2600);
  }

  function recalibrate() {
    setRecalibrating(true);
    flash("Recalibrated against your latest profile.");
    setTimeout(() => setRecalibrating(false), 900);
  }

  function removeTrack() {
    setTrackAdd(null);
    flash("Removed track courses from your plan.");
  }

  function downloadJSON() {
    const plan = {
      student: `${profile.basic.firstName} ${profile.basic.lastName}`.trim() || "Student",
      grade,
      status,
      generatedAt: new Date().toISOString(),
      years: grades.map((g) => ({
        grade: g,
        items: [
          ...PLAN_BY_GRADE[g].map((it, i) => ({ ...it, done: !!done[`${g}-${i}`] })),
          ...(g === grade
            ? trackCourses.map((c, i) => ({ label: c, type: "course" as const, done: !!done[`track-${i}`] }))
            : []),
        ],
      })),
      trackAdditions: trackAdd ? { track: trackAdd.trackName, courses: trackCourses } : null,
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
          const showTrackCourses = current && trackAdd && trackCourses.length > 0;
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

              {showTrackCourses && (
                <div style={{ marginTop: "1rem", paddingTop: "0.9rem", borderTop: "1px solid var(--hairline)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.55rem" }}>
                    <span className="eyebrow" style={{ fontSize: "0.66rem" }}>From your {trackAdd!.trackName} track</span>
                    <button
                      onClick={removeTrack}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: "0.7rem", padding: 0 }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {trackCourses.map((course, i) => {
                      const key = `track-${i}`;
                      return (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.7rem", cursor: "pointer" }}>
                          <input type="checkbox" checked={!!done[key]} onChange={(e) => setDone((d) => ({ ...d, [key]: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "var(--ivy)" }} />
                          <span style={{ color: "var(--ivy-bright)", display: "inline-flex" }}><Icon name="book" size={15} /></span>
                          <span style={{ fontSize: "0.9rem", color: done[key] ? "var(--ink-faint)" : "var(--ink)", textDecoration: done[key] ? "line-through" : "none", flex: 1 }}>{course}</span>
                          <span className="tag-mono" style={{ fontSize: "0.58rem" }}>Course</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
