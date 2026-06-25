"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { useUserLocal } from "@/lib/useLocal";
import { calibrateColleges, type Band } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";

const BANDS: { band: Band; color: string; note: string }[] = [
  { band: "Reach", color: "var(--reach)", note: "Ambitious — apply if you love them" },
  { band: "Target", color: "var(--target)", note: "Well-matched to your profile" },
  { band: "Likely", color: "var(--likely)", note: "Strong odds of admission" },
];

interface Shortlist { colleges: string[]; scholarships: string[] }

export default function Colleges() {
  const { profile, hydrated } = useStore();
  const [list, setList, lHydrated] = useUserLocal<Shortlist>("shortlist", { colleges: [], scholarships: [] });
  if (!hydrated || !lHydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const interests = Array.from(new Set([...profile.intake.interests, ...profile.preference.interests]));
  const sat = profile.testing.sat ?? (profile.testing.act ? Math.round(profile.testing.act * 44) : 0);
  const calibrated = calibrateColleges(sat, interests);
  const topTarget = calibrated.find((c) => c.band === "Target") ?? calibrated[0];

  const save = (name: string) =>
    setList((s) => ({ ...s, colleges: s.colleges.includes(name) ? s.colleges.filter((x) => x !== name) : [...s.colleges, name] }));

  return (
    <div className="container">
      <PageHeader eyebrow="College Planning · Colleges" title="Your Calibrated College List" lead={sat ? "Grouped by your real odds, using your scores and interests." : "Add test scores in your profile for sharper calibration. Showing interest-based fit for now."} />

      {/* EA/ED strategy — rendered recommendation, never raw text */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="surface" style={{ padding: "1.4rem 1.6rem", marginBottom: "2rem", borderLeft: "3px solid var(--marigold)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
          <Icon name="spark" size={18} /> <strong style={{ color: "var(--ink)" }}>EA / ED strategy</strong>
        </div>
        <p style={{ margin: 0, fontSize: "0.92rem" }}>
          {topTarget
            ? <>Applying <strong>Early Action</strong> to <strong>{topTarget.college.name}</strong> maximizes your odds — it&apos;s a strong fit ({topTarget.fit}%) and EA gives an admissions bump with no binding commitment. Reserve <strong>Early Decision</strong> for a Reach you&apos;d attend without hesitation.</>
            : "Build your list to see a personalized early-application strategy."}
        </p>
      </motion.div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.4rem" }}>
        {BANDS.map(({ band, color, note }) => {
          const items = calibrated.filter((c) => c.band === band);
          return (
            <div key={band} className={p.bandCol}>
              <div className={p.bandHead}>
                <span className={p.bandDot} style={{ background: color }} />
                <span className={p.bandTitle}>{band}</span>
                <span className={p.bandCount}>{items.length}</span>
              </div>
              <p className="muted" style={{ fontSize: "0.78rem", margin: "0 0 0.4rem" }}>{note}</p>
              <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {items.map((c) => (
                  <motion.div layout key={c.college.name} variants={riseItem} className={p.card} style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem" }}>
                      <div>
                        <a
                          href={c.college.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={p.rowName}
                          style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                        >
                          {c.college.name}
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
                            <path d="M3.5 1H11M11 1V8.5M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                        <div className={p.rowSub}>{c.college.loc} · {c.college.setting}</div>
                      </div>
                      <button className={p.saveBtn} data-saved={list.colleges.includes(c.college.name)} onClick={() => save(c.college.name)} aria-label="Save">
                        <Icon name="bookmark" size={16} />
                      </button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.7rem", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                      <span>Avg SAT {c.college.avgSat}</span>
                      <span style={{ color: "var(--ivy-bright)" }}>{c.fit}% fit</span>
                    </div>
                  </motion.div>
                ))}
                {items.length === 0 && <p className="muted" style={{ fontSize: "0.82rem" }}>None in this band yet.</p>}
              </motion.div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: "2rem" }}>
        <Link href="/college/shortlist" className="btn btn-ghost">View my shortlist ({list.colleges.length}) <Icon name="arrow" size={16} /></Link>
      </div>
    </div>
  );
}
