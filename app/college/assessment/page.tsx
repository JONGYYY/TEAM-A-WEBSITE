"use client";

import Link from "next/link";
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

export default function AssessmentPage() {
  const { profile, assessment, hydrated } = useStore();
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
  const radarData = Object.entries(a.radar).map(([k, v]) => ({ label: RADAR_LABELS[k] ?? k, value: v as number }));

  return (
    <div className="container">
      {/* Cover */}
      <motion.section variants={staggerParent} initial="hidden" animate="show" className={`${s.cover} surface`}>
        <div className={s.coverContour} aria-hidden />
        <motion.div variants={riseItem} className={s.coverLeft}>
          <span className="eyebrow">Admissions Committee Review</span>
          <h1 className={s.coverName}>{name}</h1>
          <p className={s.coverMeta}>
            {[profile.basic.schoolYear, profile.education.school,
              profile.education.gpaUnweighted ? `GPA ${profile.education.gpaUnweighted}` : null,
              profile.testing.sat ? `SAT ${profile.testing.sat}` : null,
              profile.education.classRank && profile.education.classSize ? `Rank ${profile.education.classRank}/${profile.education.classSize}` : null,
            ].filter(Boolean).join(" · ")}
          </p>
          <div className={s.verdictRow}>
            <div className={s.overall}>
              <span className={s.overallNum}><CountUp value={a.overallScore} decimals={1} duration={900} /></span>
              <span className={s.overallMax}>/ 5</span>
            </div>
            <span className={s.verdictBadge}>{a.verdict}</span>
          </div>
        </motion.div>
        <motion.div variants={riseItem} className={s.coverRadar}>
          <Radar data={radarData} size={300} />
        </motion.div>
      </motion.section>

      {/* Section 1: Academic */}
      <Section n={1} title="Academic Evaluation" rating={a.academic.rating}>
        <div className={s.statRow}>
          {a.academic.stats.map((st, i) => (
            <div key={i} className={`${s.statCard} well`}>
              <span className={s.statVal}>{st.value}</span>
              <span className={s.statLabel}>{st.label}</span>
              {st.note && <span className={s.statNote}>{st.note}</span>}
            </div>
          ))}
        </div>
        {a.academic.comparison.length > 0 && (
          <div className={s.compare}>
            <span className="eyebrow">Compared with school averages</span>
            {a.academic.comparison.map((c, i) => (
              <div key={i} className={s.compareRow}>
                <span className={s.compareMetric}>{c.metric}</span>
                <span className={s.compareVals}><strong>{c.student}</strong> <span className="muted">vs {c.schoolAvg}</span></span>
                <span className={s.compareDelta} data-pos={/above/i.test(c.delta)}>{c.delta}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 2: Extracurricular */}
      <Section n={2} title="Extracurricular Evaluation" rating={a.extracurricular.rating}>
        <div className={s.tierList}>
          {a.extracurricular.items.map((it, i) => (
            <div key={i} className={s.tierItem}>
              <span className={s.tierBadge} data-tier={it.tier}>Tier {it.tier}</span>
              <div>
                <div className={s.tierTitle}>{it.title}</div>
                <div className={s.tierCat}>{it.category}</div>
                <p className={s.tierRationale}>{it.rationale}</p>
              </div>
            </div>
          ))}
        </div>
        <ul className={s.bullets}>
          {a.extracurricular.overall.map((o, i) => <li key={i}>{o}</li>)}
        </ul>
      </Section>

      {/* Section 3: Career */}
      <Section n={3} title="Career Readiness" rating={a.career.rating}>
        <div className={s.threeCol}>
          <Column icon="check" title="Doing well" items={a.career.doingWell} />
          <Column icon="spark" title="Differentiated" items={a.career.differentiated} />
          <Column icon="arrow" title="Trajectory" items={a.career.trajectory} />
        </div>
      </Section>

      {/* Section 4: Awards */}
      <Section n={4} title="Awards & Recognition" rating={a.awards.rating}>
        <div className={s.awardGroups}>
          {a.awards.groups.map((g, i) => (
            <div key={i} className={`${s.awardGroup} well`}>
              <div className={s.awardHead}>
                <span className={s.awardLevel}>{g.level}</span>
                <span className={s.awardCount}>{g.count}</span>
              </div>
              <ul>{g.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
            </div>
          ))}
        </div>
        <p className={s.summary}>{a.awards.summary}</p>
      </Section>

      {/* Section 5: Narrative */}
      <Section n={5} title="Application Narrative & Fit" rating={a.narrative.rating}>
        <div className={s.spike}>
          <span className="eyebrow">Identified spike</span>
          <p className={s.spikeText}>&ldquo;{a.narrative.spike}&rdquo;</p>
        </div>
        <ul className={s.bullets}>
          {a.narrative.committeeDescription.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
        <div className={s.fitGrid}>
          {a.narrative.fitMetrics.map((f, i) => (
            <div key={i} className={s.fitCard}>
              <div className={s.fitTop}>
                <span className={s.fitName}>{f.name}</span>
                <span className={s.fitPct}><CountUp value={f.pct} suffix="%" /></span>
              </div>
              <div className={s.fitTrack}>
                <motion.div className={s.fitFill} initial={{ width: 0 }} whileInView={{ width: `${f.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                <span className={s.fitAvg} style={{ left: `${f.avg}%` }} title={`Avg applicant ${f.avg}%`} />
              </div>
              <span className={s.fitLabel}>{f.label} · avg {f.avg}%</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 6: Strengths */}
      <Section n={6} title="Top Strengths">
        <div className={s.strengthList}>
          {a.strengths.map((st) => (
            <div key={st.n} className={s.strength}>
              <span className={s.strengthNum}>{String(st.n).padStart(2, "0")}</span>
              <div>
                <h3 className={s.strengthTitle}>{st.title}</h3>
                <ul className={s.bullets}>{st.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Section 7: Red Flags */}
      <Section n={7} title="Red Flags & Areas to Address">
        <div className={s.flagList}>
          {a.redFlags.map((f, i) => (
            <div key={i} className={s.flag}>
              <div className={s.flagHead}>
                <Icon name="warning" size={16} />
                <span className={s.flagTitle}>{f.title}</span>
                <span className={s.severity} data-sev={f.severity}>{f.severity}</span>
              </div>
              <ul className={s.bullets}>{f.points.map((p, j) => <li key={j}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer: overall + actions */}
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
    </div>
  );
}

function Section({ n, title, rating, children }: { n: number; title: string; rating?: string; children: React.ReactNode }) {
  return (
    <motion.section
      className={s.section}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={s.sectionHead}>
        <span className={s.sectionNum}>Section {String(n).padStart(2, "0")}</span>
        <h2 className={s.sectionTitle}>{title}</h2>
        {rating && <span className={s.ratingBadge}>✦ {rating}</span>}
      </div>
      {children}
    </motion.section>
  );
}

function Column({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div className={`${s.col} well`}>
      <div className={s.colHead}><Icon name={icon} size={16} /> {title}</div>
      <ul className={s.bullets}>{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
    </div>
  );
}
