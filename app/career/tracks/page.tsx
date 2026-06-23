"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useLocal } from "@/lib/useLocal";
import { scoreTracks } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { easeOut } from "@/lib/motion";
import p from "@/components/planning.module.css";

export default function Tracks() {
  const { profile, hydrated } = useStore();
  const [career, , cHydrated] = useLocal<{ pillars: Record<string, number> } | null>("dc.career", null);
  const [active, setActive] = useState(0);
  if (!hydrated || !cHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const interests = Array.from(new Set([...profile.intake.interests, ...profile.preference.interests]));
  const ranked = scoreTracks(interests, career?.pillars).slice(0, 3);

  if (ranked.length === 0) {
    return (
      <div className="container">
        <PageHeader eyebrow="Career Planning · Tracks" title="My Career Tracks" />
        <div className={p.emptyState}>
          <h3>No tracks yet</h3>
          <p style={{ marginBottom: "1.2rem" }}>Take the discovery quiz to generate your top-3 tracks.</p>
          <Link href="/career/discovery" className="btn btn-primary">Start Career Discovery <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    );
  }

  const t = ranked[active].track;

  return (
    <div className="container">
      <PageHeader eyebrow="Career Planning · Tracks" title="My Career Tracks" lead="Switch between your top matches. Each track shows the courses, majors, and roles that build toward it." />

      <div className={p.pillRow}>
        {ranked.map((r, i) => (
          <button key={r.track.id} className="chip" data-selected={active === i} onClick={() => setActive(i)}>
            {r.track.name} · {r.fit}%
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: easeOut }} className="surface" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.4rem" }}>
            <span className={p.cardIcon} style={{ margin: 0 }}><Icon name={t.icon} size={24} /></span>
            <div>
              <h2 style={{ margin: 0 }}>{t.name}</h2>
              <p style={{ margin: 0 }}>{t.tagline}</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.4rem" }}>
            <TrackCol title="Recommended courses" icon="book" items={t.courses} />
            <TrackCol title="Sample roles" icon="spark" items={t.sampleRoles} />
            <TrackCol title="Best-fit majors" icon="grad" items={t.majors} />
          </div>

          <div style={{ marginTop: "1.8rem", display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <Link href="/career/planner" className="btn btn-primary">Add to my 4-year plan <Icon name="arrow" size={16} /></Link>
            <Link href="/college/majors" className="btn btn-ghost">See matching majors</Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function TrackCol({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.7rem", color: "var(--ink)", fontWeight: 600 }}>
        <span style={{ color: "var(--ivy-bright)" }}><Icon name={icon} size={16} /></span> {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {items.map((it) => (
          <li key={it} style={{ fontSize: "0.9rem", color: "var(--ink-soft)", paddingLeft: "1rem", position: "relative" }}>
            <span style={{ position: "absolute", left: 0, color: "var(--marigold-deep)" }}>▸</span>{it}
          </li>
        ))}
      </ul>
    </div>
  );
}
