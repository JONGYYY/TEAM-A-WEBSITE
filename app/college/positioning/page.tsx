"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { buildPositioning } from "@/lib/positioning";
import { completionPct } from "@/lib/taxonomy";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";
import { useToast } from "@/lib/toast";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";

export default function Positioning() {
  const { profile, hydrated } = useStore();
  const { toast } = useToast();
  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const interests = [...profile.intake.interests, ...profile.preference.interests];

  if (interests.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="College Planning · Positioning" title="Positioning Statement" />
        <div className={p.emptyState}>
          <h3>Tell us what you&apos;re into first</h3>
          <p style={{ marginBottom: "1.2rem" }}>Your positioning statement is written from your interests and activities. Add a few and it appears here.</p>
          <Link href="/college/profile" className="btn btn-primary">Build your profile <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    );
  }

  const pos = buildPositioning(profile);
  const pct = completionPct(profile);

  function copy() {
    navigator.clipboard?.writeText(pos.statement).then(
      () => toast("Positioning statement copied."),
      () => toast("Couldn't copy — select and copy manually.", "warn")
    );
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow="College Planning · Positioning"
        title="Your Positioning Statement"
        lead="The one-breath through-line a reader would use to describe you. It sharpens as your profile grows — use it to align your essays, activities, and college list."
      />

      <motion.div variants={staggerParent} initial="hidden" animate="show">
        {/* The statement */}
        <motion.div variants={riseItem} className="surface" style={{ padding: "2rem", borderLeft: "3px solid var(--marigold)", marginBottom: "1.4rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <span className="eyebrow">{pos.headline}</span>
            <button className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={copy}>
              <Icon name="copy" size={14} /> Copy
            </button>
          </div>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.15rem, 2vw, 1.5rem)", lineHeight: 1.5, color: "var(--ink)", margin: 0 }}>
            {pos.statement}
          </p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "1.2rem" }}>
            {pos.keywords.map((k) => <span key={k} className="tag-mono">{k}</span>)}
          </div>
        </motion.div>

        {/* Strength meter */}
        <motion.div variants={riseItem} className="surface" style={{ padding: "1.2rem 1.6rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1.4rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--ink)", lineHeight: 1 }}>
              <CountUp value={pos.strength} suffix="%" />
            </div>
            <span className="eyebrow">Signal strength</span>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ height: 8, borderRadius: 999, background: "var(--hairline)", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pos.strength}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,var(--ivy-bright),var(--marigold))" }}
              />
            </div>
            <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.5rem" }}>
              {pos.strength >= 70
                ? "Strong and specific — a reader could repeat this back to you."
                : pos.strength >= 45
                ? "Taking shape. More depth in one area will sharpen it."
                : "Still broad. Pick a lane and let your activities orbit it."}
            </p>
          </div>
        </motion.div>

        {/* Angles */}
        <span className="eyebrow">How to use it</span>
        <motion.div variants={riseItem} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "1rem", marginTop: "0.8rem" }}>
          {pos.angles.map((a, i) => (
            <div key={a.title} className="surface" style={{ padding: "1.3rem" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--marigold-deep)" }}>{String(i + 1).padStart(2, "0")}</span>
              <h3 style={{ margin: "0.3rem 0 0.5rem" }}>{a.title}</h3>
              <p style={{ fontSize: "0.9rem", margin: 0 }}>{a.body}</p>
            </div>
          ))}
        </motion.div>

        <div style={{ marginTop: "2rem", display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <Link href={pct >= 60 ? "/college/assessment" : "/college/profile"} className="btn btn-primary">
            {pct >= 60 ? "See my full evaluation" : "Strengthen my profile"} <Icon name="arrow" size={16} />
          </Link>
          <Link href="/college/majors" className="btn btn-ghost">Explore matching majors</Link>
        </div>
      </motion.div>
    </div>
  );
}
