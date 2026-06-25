"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { completionPct } from "@/lib/taxonomy";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";
import { Radar } from "@/components/Radar";
import { staggerParent, riseItem } from "@/lib/motion";
import s from "./assessment.module.css";

const RADAR_LABELS: Record<string, string> = {
  academic: "Academic", extracurricular: "Extracurr.", career: "Career",
  awards: "Awards", narrative: "Narrative", strengths: "Strengths", redFlags: "Red Flags",
};

/* per-section accent colors — tuned to read on both parchment and dark */
const ACCENT: Record<number, string> = {
  1: "#12a7bd", // academic — teal
  2: "#d98a1f", // extracurricular — gold
  3: "#2fa56e", // career — green
  4: "#7c5cff", // awards — violet
  5: "#e0a531", // narrative — amber
  6: "#2fa56e", // strengths — green
  7: "#e05a5a", // red flags — red
};

const TIER_COLOR: Record<number, string> = { 1: "#d98a1f", 2: "#7c5cff", 3: "#3b82f6", 4: "#2fa56e" };
const TIER_STARS: Record<number, number> = { 1: 5, 2: 4, 3: 3, 4: 1 };

const NAV_ITEMS = [
  { n: 1, key: "academic", label: "Academic" },
  { n: 2, key: "extracurricular", label: "Extracurr." },
  { n: 3, key: "career", label: "Career" },
  { n: 4, key: "awards", label: "Awards" },
  { n: 5, key: "narrative", label: "Narrative" },
  { n: 6, key: "strengths", label: "Strengths" },
  { n: 7, key: "redFlags", label: "Red Flags" },
];

function scrollToSection(n: number) {
  const el = document.getElementById(`eval-section-${n}`);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function AssessmentPage() {
  const { profile, assessment, hydrated } = useStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const [railOn, setRailOn] = useState(false);
  const [active, setActive] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const hero = heroRef.current;
      if (hero) setRailOn(hero.getBoundingClientRect().bottom < 150);
      // figure out which section is active
      let current = 1;
      for (let i = 1; i <= 7; i++) {
        const el = document.getElementById(`eval-section-${i}`);
        if (el && el.getBoundingClientRect().top <= 200) current = i;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [assessment]);

  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const pct = completionPct(profile);

  if (!assessment) {
    return (
      <div className="container">
        <div className={`${s.gate} surface`}>
          <span className={s.gateIcon}><Icon name="lock" size={28} /></span>
          <h1>Your Admissions Evaluation awaits</h1>
          <p>
            Complete your College Profile and we&apos;ll generate a candid, committee-style review —
            scores across seven dimensions, your strengths, red flags, and a concrete action plan.
          </p>
          <div className={s.gateBar}>
            <div className={s.gateFill} style={{ width: `${pct}%` }} />
          </div>
          <span className="muted" style={{ fontSize: "0.85rem" }}>{pct}% complete · {pct >= 60 ? "ready to generate" : "60% recommended"}</span>
          <div style={{ marginTop: "1.4rem" }}>
            <Link href="/college/profile" className="btn btn-primary">
              {pct > 0 ? "Continue your profile" : "Build your profile"} <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const a = assessment;
  const name = `${profile.basic.firstName} ${profile.basic.lastName}`.trim() || "Your Profile";
  const meta = [
    profile.basic.schoolYear, profile.education.school,
    profile.education.gpaUnweighted ? `GPA ${profile.education.gpaUnweighted}` : null,
    profile.testing.sat ? `SAT ${profile.testing.sat}` : null,
    profile.education.classRank && profile.education.classSize ? `Rank ${profile.education.classRank}/${profile.education.classSize}` : null,
  ].filter(Boolean).join(" · ");
  const radarData = Object.entries(a.radar).map(([k, v]) => ({ label: RADAR_LABELS[k] ?? k, value: v as number }));
  const ringPct = Math.max(0, Math.min(1, a.overallScore / 5));

  return (
    <div className={s.page}>
      {/* ── Big hero banner (scrolls away, recap slides into the right rail) ── */}
      <motion.section variants={staggerParent} initial="hidden" animate="show" ref={heroRef} className={`${s.hero} surface`}>
        <div className={s.heroContour} aria-hidden />
        <motion.div variants={riseItem} className={s.heroLeft}>
          <span className="eyebrow">Admissions Committee Review</span>
          <h1 className={s.heroName}>{name}</h1>
          <p className={s.heroMeta}>{meta}</p>
          <div className={s.verdictRow}>
            <div className={s.overall}>
              <span className={s.overallNum}><CountUp value={a.overallScore} decimals={1} duration={900} /></span>
              <span className={s.overallMax}>/ 5</span>
            </div>
            <span className={s.verdictBadge}>{a.verdict}</span>
          </div>
        </motion.div>
        <motion.div variants={riseItem} className={s.heroRadar}>
          <Radar data={radarData} size={300} onSelect={(i) => scrollToSection(i + 1)} />
          <span className={s.radarHint}>Click a category to jump to it</span>
        </motion.div>
      </motion.section>

      {/* ── Two-column body: sections (left) + sticky recap rail (right) ── */}
      <div className={s.body}>
        <main className={s.main}>
          {/* Section 1 — Academic */}
          <Section n={1} title="Academic Evaluation" rating={a.academic.rating}>
            <div className={s.statRow}>
              {a.academic.stats.map((st, i) => (
                <div key={i} className={s.statCard}>
                  <span className={s.statLabel}>{st.label}</span>
                  <span className={s.statVal}>{st.value}</span>
                  {st.note && <span className={s.statNote}>{st.note}</span>}
                </div>
              ))}
            </div>
            {a.academic.comparison.length > 0 && (
              <div className={s.compare}>
                <div className={s.compareHead}>
                  <span className={s.compareTitle}>Comparison with school averages</span>
                </div>
                {a.academic.comparison.map((c, i) => {
                  const pos = /above|significant/i.test(c.delta);
                  return (
                    <div key={i} className={s.compareRow}>
                      <span className={s.compareMetric}>{c.metric}</span>
                      <span className={s.compareVals}><strong>{c.student}</strong> <span className="muted">vs {c.schoolAvg}</span></span>
                      <span className={s.compareDelta} data-pos={pos}>{c.delta}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Section 2 — Extracurricular */}
          <Section n={2} title="Extracurricular Evaluation" rating={a.extracurricular.rating}>
            <div className={s.actList}>
              {a.extracurricular.items.map((it, i) => {
                const color = TIER_COLOR[it.tier] ?? "#7c5cff";
                return (
                  <div key={i} className={s.actCard} style={{ borderLeftColor: color }}>
                    <div className={s.actTop}>
                      <div className={s.actMeta}>
                        <span className={s.tierBadge} style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>Tier {it.tier}</span>
                        <span className={s.actType}>{it.category}</span>
                      </div>
                      <Stars n={TIER_STARS[it.tier] ?? 3} color={color} />
                    </div>
                    <div className={s.actName}>{it.title}</div>
                    <div className={s.actBullet}>
                      <span className={s.bulletDot} style={{ background: color }} />
                      <p className={s.actText}>{it.rationale}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {a.extracurricular.overall.length > 0 && (
              <div className={s.summaryDark}>
                <span className={s.summaryDarkLabel}>Overall Assessment</span>
                <ul className={s.summaryDarkList}>
                  {a.extracurricular.overall.map((o, i) => <li key={i}><span>▸</span><span>{o}</span></li>)}
                </ul>
              </div>
            )}
          </Section>

          {/* Section 3 — Career */}
          <Section n={3} title="Career Readiness" rating={a.career.rating}>
            <div className={s.careerSubs}>
              <CareerSub color="#2fa56e" icon="✦" label="What you're doing well" items={a.career.doingWell} />
              <CareerSub color="#12a7bd" icon="◆" label="How you're differentiated" items={a.career.differentiated} />
              <CareerSub color="#7c5cff" icon="▲" label="Trajectory & meaning" items={a.career.trajectory} />
            </div>
          </Section>

          {/* Section 4 — Awards */}
          <Section n={4} title="Awards & Recognition" rating={a.awards.rating}>
            <div className={s.awardGrid}>
              {a.awards.groups.map((g, i) => {
                const color = awardColor(g.level);
                return (
                  <div key={i} className={s.awardCol} style={{ borderTopColor: color }}>
                    <div className={s.awardHead} style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
                      <span className={s.awardLevel}>{g.level}</span>
                      <span className={s.awardCount} style={{ background: color }}>{g.count}</span>
                    </div>
                    <ul className={s.awardItems}>
                      {g.items.map((it, j) => (
                        <li key={j}><span className={s.awardDot} style={{ background: color }} />{it}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            {a.awards.summary && <div className={s.summaryBox}><p>{a.awards.summary}</p></div>}
          </Section>

          {/* Section 5 — Narrative */}
          <Section n={5} title="Application Narrative & Fit" rating={a.narrative.rating}>
            <div className={s.narrativeTop}>
              <div className={s.spikeCard}>
                <span className={s.spikeLabel}>✦ Identified spike</span>
                <p className={s.spikeText}>&ldquo;{a.narrative.spike}&rdquo;</p>
              </div>
              <div className={s.committeeBox}>
                <span className={s.committeeLabel}>Committee description</span>
                <ul className={s.committeeList}>
                  {a.narrative.committeeDescription.map((d, i) => (
                    <li key={i}><span className={s.committeeMarker}>{i + 1}</span><span>{d}</span></li>
                  ))}
                </ul>
              </div>
            </div>
            {a.narrative.fitMetrics.length > 0 && <FitMetrics metrics={a.narrative.fitMetrics} />}
          </Section>

          {/* Section 6 — Strengths */}
          <Section n={6} title="Top Strengths">
            <div className={s.strengthGrid}>
              {a.strengths.map((st, idx) => (
                <div key={st.n} className={`${s.strengthCard} ${idx === a.strengths.length - 1 && a.strengths.length % 2 === 1 ? s.strengthFull : ""}`}>
                  <div className={s.strengthTop}>
                    <span className={s.strengthNum}>{String(st.n).padStart(2, "0")}</span>
                    <h3 className={s.strengthTitle}>{st.title}</h3>
                  </div>
                  <ul className={s.strengthBullets}>
                    {st.points.map((p, i) => <li key={i}><span className={s.strengthStar}>✦</span><span>{p}</span></li>)}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* Section 7 — Red Flags */}
          <Section n={7} title="Red Flags & Areas to Address" warm>
            <div className={s.flagList}>
              {a.redFlags.map((f, i) => {
                const color = f.severity === "minor" ? "#9a93b8" : "#d98a1f";
                return (
                  <div key={i} className={s.flagCard} style={{ borderLeftColor: color }}>
                    <div className={s.flagHead}>
                      <span className={s.flagDot} style={{ background: color }} />
                      <span className={s.flagTitle}>{f.title}</span>
                      <span className={s.flagSeverity} style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>{f.severity}</span>
                    </div>
                    <ul className={s.flagBullets}>
                      {f.points.map((p, j) => <li key={j}><span style={{ color }}>›</span><span>{p}</span></li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Footer — overall + actions */}
          <section className={`${s.final} surface`}>
            <div className={s.finalCol}>
              <span className="eyebrow">Overall Assessment</span>
              {a.overallAssessment.map((o, i) => <p key={i} className={s.finalLine}>{o}</p>)}
            </div>
            <div className={s.finalCol}>
              <span className="eyebrow">Action Items</span>
              <ol className={s.actionList}>
                {a.actionItems.map((it, i) => <li key={i}>{it}</li>)}
              </ol>
              <div style={{ marginTop: "1.2rem", display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                <Link href="/college/profile" className="btn btn-ghost">Refine profile</Link>
                <Link href="/college/colleges" className="btn btn-primary">See my college list <Icon name="arrow" size={16} /></Link>
              </div>
            </div>
          </section>
        </main>

        {/* Sticky recap rail */}
        <aside className={s.railWrap}>
          <div className={`${s.rail} ${railOn ? s.railOn : ""}`} aria-hidden={!railOn}>
            <div className={s.railHeader}>
              <span className="eyebrow">Overall Evaluation</span>
              <div className={s.railName}>{name}</div>
              <div className={s.railMeta}>{meta}</div>
            </div>

            <div className={s.railRadar}>
              <Radar data={radarData} size={236} onSelect={(i) => scrollToSection(i + 1)} />
            </div>

            <div className={s.railScore}>
              <div className={s.ring}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="var(--hairline)" strokeWidth="5" />
                  <circle
                    cx="36" cy="36" r="30" fill="none" stroke="var(--marigold)" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={(1 - ringPct) * 2 * Math.PI * 30}
                    transform="rotate(-90 36 36)"
                    style={{ transition: "stroke-dashoffset 1s var(--ease-out)" }}
                  />
                </svg>
                <div className={s.ringInner}><span>{a.overallScore.toFixed(1)}</span><small>/5</small></div>
              </div>
              <div className={s.railVerdict}>
                <div className={s.railVerdictLabel}>{a.verdict}</div>
                <div className={s.railVerdictSub}>Across seven committee dimensions</div>
              </div>
            </div>

            <nav className={s.railNav}>
              {NAV_ITEMS.map((it) => {
                const color = ACCENT[it.n];
                const isActive = active === it.n;
                const rating = (a.radar[it.key] as number | undefined);
                return (
                  <button
                    key={it.n}
                    className={`${s.railNavItem} ${isActive ? s.railNavActive : ""}`}
                    style={isActive ? { borderColor: color, background: `color-mix(in srgb, ${color} 12%, transparent)` } : undefined}
                    onClick={() => scrollToSection(it.n)}
                  >
                    <span className={s.railNavNum} style={{ background: color }}>{it.n}</span>
                    <span className={s.railNavLabel}>{it.label}</span>
                    {rating != null && <span className={s.railNavRating}>{rating.toFixed(1)}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── helpers ───────────────────────── */

function Section({ n, title, rating, warm, children }: { n: number; title: string; rating?: string; warm?: boolean; children: React.ReactNode }) {
  return (
    <motion.section
      id={`eval-section-${n}`}
      className={`${s.section} ${warm ? s.sectionWarm : ""}`}
      style={{ ["--accent" as string]: ACCENT[n] } as React.CSSProperties}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={s.sectionHead}>
        <span className={s.sectionNum}>Section {String(n).padStart(2, "0")}</span>
        <h2 className={s.sectionTitle}>{title}</h2>
        {rating && <span className={s.ratingTag}>✦ {rating}</span>}
      </div>
      {children}
    </motion.section>
  );
}

function Stars({ n, color }: { n: number; color: string }) {
  return (
    <div className={s.stars} title={`Impact ${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 12 12" fill={i <= n ? color : "none"} stroke={i <= n ? color : "var(--hairline-strong)"} strokeWidth="1">
          <polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5" />
        </svg>
      ))}
    </div>
  );
}

function CareerSub({ color, icon, label, items }: { color: string; icon: string; label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className={s.careerSub}>
      <div className={s.careerSubHead} style={{ borderLeftColor: color }}>
        <span style={{ color }}>{icon}</span>
        <span className={s.careerSubLabel}>{label}</span>
      </div>
      <div className={s.careerSubBody} style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
        {items.map((it, i) => (
          <div key={i} className={s.careerPoint}>
            <span className={s.careerDot} style={{ background: color }} />
            <p>{it}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FitMetrics({ metrics }: { metrics: { name: string; pct: number; avg: number; label: string; detail: string }[] }) {
  const [sel, setSel] = useState(0);
  const m = metrics[sel];
  const colors = ["#12a7bd", "#7c5cff", "#2fa56e", "#d98a1f", "#2fa56e", "#b4530a"];
  const c = colors[sel % colors.length];
  return (
    <div className={s.fitSection}>
      <span className={s.fitSectionLabel}>Fit metrics — click a category to explore</span>
      <div className={s.fitSelectorRow}>
        {metrics.map((f, i) => {
          const fc = colors[i % colors.length];
          const isActive = i === sel;
          return (
            <button
              key={i}
              className={`${s.fitSelector} ${isActive ? s.fitSelectorActive : ""}`}
              style={isActive ? { background: fc, borderColor: fc } : { borderColor: `color-mix(in srgb, ${fc} 35%, transparent)` }}
              onClick={() => setSel(i)}
            >
              <span className={s.fitSelPct} style={isActive ? { color: "#fff" } : { color: fc }}>{f.pct}%</span>
              <span className={s.fitSelName} style={isActive ? { color: "rgba(255,255,255,0.9)" } : undefined}>{f.name}</span>
            </button>
          );
        })}
      </div>
      <div className={s.fitDetail}>
        <div className={s.fitDetailHead}>
          <span className={s.fitDetailName}>{m.name} Fit</span>
          <span className={s.fitDetailTag} style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}>{m.label}</span>
        </div>
        <div className={s.fitTrackLabels}><span>0%</span><span>Avg. applicant ({m.avg}%)</span><span>100%</span></div>
        <div className={s.fitTrack}>
          <motion.div
            className={s.fitBar}
            style={{ background: c, boxShadow: `0 0 14px color-mix(in srgb, ${c} 45%, transparent)` }}
            initial={{ width: 0 }}
            animate={{ width: `${m.pct}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          <span className={s.fitAvg} style={{ left: `${m.avg}%` }} title={`Avg. applicant ${m.avg}%`} />
          <span className={s.fitUser} style={{ left: `${m.pct}%`, background: c }} />
        </div>
        <p className={s.fitDesc}>{m.detail}</p>
      </div>
    </div>
  );
}

function awardColor(level: string): string {
  const l = level.toLowerCase();
  if (l.includes("inter")) return "#d4880f";
  if (l.includes("nation")) return "#d98a1f";
  if (l.includes("state")) return "#7c5cff";
  if (l.includes("region")) return "#3b82f6";
  if (l.includes("school")) return "#2fa56e";
  return "#9a93b8";
}
