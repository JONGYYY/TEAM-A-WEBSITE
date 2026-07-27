"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { rankMajors } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";

export default function Majors() {
  const { profile, assessment, hydrated } = useStore();
  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const interests = Array.from(new Set([...profile.intake.interests, ...profile.preference.interests]));
  const recMajors = assessment?.recommendations?.majors ?? [];

  if (interests.length === 0 && recMajors.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="College Planning · Majors" title="Best-fit Majors" />
        <div className={p.emptyState}>
          <h3>Tell us what you like first</h3>
          <p style={{ marginBottom: "1.2rem" }}>Add interests in your profile and we&apos;ll rank majors for you.</p>
          <Link href="/college/profile" className="btn btn-primary">Build your profile <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    );
  }

  const ranked = rankMajors(interests);

  return (
    <div className="container">
      <PageHeader eyebrow="College Planning · Majors" title="Best-fit Majors" lead="Ranked from your interests. Each fit score reflects how well a major aligns with what you've told us." />

      {recMajors.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="surface"
          style={{ padding: "1.5rem 1.6rem", marginBottom: "2rem", borderLeft: "3px solid var(--marigold)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.3rem" }}>
            <Icon name="sparkle" size={18} />
            <strong style={{ color: "var(--ink)" }}>From your Admissions Evaluation</strong>
          </div>
          <p className="muted" style={{ fontSize: "0.88rem", margin: "0 0 1.1rem" }}>
            {assessment?.recommendations?.summary || "Your two best-fit majors, chosen from your interests, activities, and trajectory."}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {recMajors.map((m) => (
              <div key={m.name} className={p.card} style={{ padding: "1.1rem 1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--ink)" }}>{m.name}</span>
                  <span className="tag-mono" style={{ color: "var(--ivy-bright)", whiteSpace: "nowrap" }}>{m.fit}% fit</span>
                </div>
                <p className="muted" style={{ fontSize: "0.86rem", margin: 0 }}>{m.why}</p>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {ranked.length > 0 && (
        <span className="eyebrow" style={{ display: "block", marginBottom: "1rem" }}>Explore more by interest</span>
      )}
      <motion.div variants={staggerParent} initial="hidden" animate="show" className={p.cardGrid}>
        {ranked.map((r) => (
          <motion.div key={r.major.name} variants={riseItem} className={`${p.card} ${p.cardHover}`}>
            <span className={p.cardIcon}><Icon name="book" size={22} /></span>
            <div className={p.cardTitle}>{r.major.name}</div>
            <div className={p.cardBlurb}>{r.major.blurb}</div>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.7rem" }}>
              {r.major.careers.map((c) => <span key={c} className="tag-mono">{c}</span>)}
            </div>
            <div className={p.fitBar}>
              <motion.div className={p.fitFill} initial={{ width: 0 }} animate={{ width: `${r.fit}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
            </div>
            <div className={p.fitMeta}>
              <span className="muted" style={{ fontSize: "0.78rem" }}>Fit</span>
              <span className={p.fitPct}><CountUp value={r.fit} suffix="%" /></span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
