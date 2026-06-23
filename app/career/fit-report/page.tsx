"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useLocal } from "@/lib/useLocal";
import { scoreTracks } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";

export default function FitReport() {
  const { profile, hydrated } = useStore();
  const [career, , cHydrated] = useLocal<{ pillars: Record<string, number> } | null>("dc.career", null);
  if (!hydrated || !cHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const interests = Array.from(new Set([...profile.intake.interests, ...profile.preference.interests]));

  if (!career && interests.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="Career Planning · Fit" title="Career Fit Map" />
        <div className={p.emptyState}>
          <h3>Take the quiz first</h3>
          <p style={{ marginBottom: "1.2rem" }}>Your Career Fit Map is built from the discovery quiz and your interests.</p>
          <Link href="/career/discovery" className="btn btn-primary">Start Career Discovery <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    );
  }

  const ranked = scoreTracks(interests, career?.pillars);
  const top3 = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="container">
      <PageHeader eyebrow="Career Planning · Fit" title="Your Career Fit Map" lead="Your strongest matches, scored from your quiz and interests. Explore a track to see courses, majors, and roles." />

      <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem", marginBottom: "2rem" }}>
        {top3.map((r, i) => (
          <motion.div key={r.track.id} variants={riseItem} className={`${p.card} ${p.cardHover}`} style={{ borderColor: i === 0 ? "var(--marigold)" : undefined }}>
            {i === 0 && <span className="tag-mono" style={{ position: "absolute", top: "1rem", right: "1rem", color: "var(--marigold-deep)", borderColor: "var(--marigold)" }}>Top match</span>}
            <span className={p.cardIcon}><Icon name={r.track.icon} size={22} /></span>
            <div className={p.cardTitle}>{r.track.name}</div>
            <div className={p.cardBlurb}>{r.track.tagline}</div>
            <div className={p.fitBar}>
              <motion.div className={p.fitFill} initial={{ width: 0 }} animate={{ width: `${r.fit}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.1 }} />
            </div>
            <div className={p.fitMeta}>
              <span className="muted" style={{ fontSize: "0.78rem" }}>Fit score</span>
              <span className={p.fitPct}><CountUp value={r.fit} suffix="%" /></span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div style={{ display: "flex", gap: "0.8rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <Link href="/career/tracks" className="btn btn-primary">Explore my tracks <Icon name="arrow" size={16} /></Link>
        <Link href="/career/planner" className="btn btn-ghost">Build my 4-year plan</Link>
      </div>

      <span className="eyebrow">Other tracks worth a look</span>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.8rem" }}>
        {rest.map((r) => (
          <div key={r.track.id} className={p.listRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <span style={{ color: "var(--ivy-bright)" }}><Icon name={r.track.icon} size={18} /></span>
              <div>
                <div className={p.rowName}>{r.track.name}</div>
                <div className={p.rowSub}>{r.track.tagline}</div>
              </div>
            </div>
            <span className="mono" style={{ color: "var(--ink-faint)" }}>{r.fit}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
