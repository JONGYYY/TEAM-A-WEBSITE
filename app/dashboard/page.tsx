"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { completionPct } from "@/lib/taxonomy";
import { rankMajors, scoreTracks, calibrateColleges } from "@/lib/content";
import { Intake } from "@/components/Intake";
import { Icon } from "@/components/Icon";
import { CountUp } from "@/components/CountUp";
import { useToast } from "@/lib/toast";
import { downloadBackup, importBackup } from "@/lib/backup";
import { staggerParent, riseItem, scaleIn } from "@/lib/motion";
import s from "./dashboard.module.css";

const GOAL_NEXT: Record<string, { href: string; label: string }> = {
  best_fit_colleges: { href: "/college/profile", label: "Build your College Profile" },
  explore_careers: { href: "/career/discovery", label: "Start Career Discovery" },
  find_scholarships: { href: "/college/profile", label: "Build your profile to match scholarships" },
  know_my_chances: { href: "/college/profile", label: "Build your College Profile" },
};

export default function Dashboard() {
  const { profile, assessment, hydrated, resetAll } = useStore();
  const { toast } = useToast();
  const [justFinished, setJustFinished] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const n = importBackup(await file.text());
      toast(`Restored ${n} item${n === 1 ? "" : "s"}. Reloading…`);
      setTimeout(() => window.location.reload(), 700);
    } catch {
      toast("That file isn't a DreamCollege backup.", "warn");
    }
  }

  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const firstRun = !profile.intake.completed;
  if (firstRun && !justFinished) {
    return (
      <div className="container">
        <FirstRunHero />
        <div style={{ height: "2.2rem" }} />
        <Intake onDone={() => setJustFinished(true)} />
      </div>
    );
  }

  const pct = completionPct(profile);
  const name = profile.basic.firstName || "there";
  const grade = profile.intake.grade ?? 11;
  const underclassman = grade <= 10;
  const goalNext = profile.intake.primaryGoal
    ? GOAL_NEXT[profile.intake.primaryGoal]
    : { href: "/college/profile", label: "Build your College Profile" };
  const next = underclassman
    ? { href: "/career/discovery", label: "Start with Career Discovery" }
    : goalNext;

  const activitiesCount = profile.activities.filter((a) => a.type || a.organization).length;
  const awardsCount = profile.awards.filter((a) => a.title).length;

  // Recent recommendations (PRD return-visit spec), derived from the profile.
  const recInterests = Array.from(new Set([...profile.intake.interests, ...profile.preference.interests]));
  const topMajor = recInterests.length ? rankMajors(recInterests)[0] : null;
  const topTrack = recInterests.length ? scoreTracks(recInterests)[0] : null;
  const satEquiv = profile.testing.sat ?? (profile.testing.act ? Math.round(profile.testing.act * 44) : 0);
  const topCollege = recInterests.length ? calibrateColleges(satEquiv, recInterests).find((c) => c.band === "Target") ?? calibrateColleges(satEquiv, recInterests)[0] : null;
  const recs = [
    topMajor && { href: "/college/majors", icon: "book", tag: "Major", title: topMajor.major.name, meta: `${topMajor.fit}% fit` },
    topTrack && { href: "/career/fit-report", icon: topTrack.track.icon, tag: "Career track", title: topTrack.track.name, meta: `${topTrack.fit}% fit` },
    topCollege && { href: "/college/colleges", icon: "building", tag: topCollege.band, title: topCollege.college.name, meta: `${topCollege.fit}% fit` },
  ].filter(Boolean) as { href: string; icon: string; tag: string; title: string; meta: string }[];

  return (
    <div className="container">
      <motion.div variants={staggerParent} initial="hidden" animate="show">
        <motion.span variants={riseItem} className="eyebrow">
          {greeting()} · Grade {grade}
        </motion.span>
        <motion.h1 variants={riseItem} className={s.h1}>
          Welcome back, <em className={s.em}>{name}</em>.
        </motion.h1>
        <motion.p variants={riseItem} className={s.lead}>
          {leadFor(profile.intake.mood)}
        </motion.p>

        {/* Next best action */}
        <motion.div variants={scaleIn} className={`${s.nextCard} surface`}>
          <div className={s.nextContour} aria-hidden />
          <div className={s.nextBody}>
            <span className="tag-mono">Your next step</span>
            <h2 className={s.nextTitle}>{next.label}</h2>
            <p className={s.nextSub}>
              {pct < 100
                ? `You're ${pct}% through your profile. Takes ~6 min · unlocks your Admissions Evaluation.`
                : "Your profile is complete — explore your matches and evaluation."}
            </p>
            <Link href={next.href} className="btn btn-primary">
              Continue <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className={s.ring}>
            <ProgressRing pct={pct} />
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={riseItem} className={s.statGrid}>
          <Stat label="Profile complete" value={pct} suffix="%" />
          <Stat
            label="Unweighted GPA"
            value={profile.education.gpaUnweighted ?? 0}
            decimals={2}
            empty={profile.education.gpaUnweighted == null}
          />
          <Stat label="Activities" value={activitiesCount} />
          <Stat label="Awards" value={awardsCount} />
        </motion.div>

        {/* Tiles */}
        <motion.div variants={riseItem} className={s.tileGrid}>
          <Tile href="/college/assessment" icon="award" title="Admissions Evaluation" desc={assessment ? "View your committee review" : pct >= 60 ? "Ready — generate your review" : "Complete profile to unlock"} locked={pct < 60 && !assessment} accent />
          <Tile href="/college/majors" icon="book" title="Best-fit Majors" desc="Ranked from your interests" />
          <Tile href="/college/colleges" icon="building" title="College List" desc="Likely · Target · Reach" />
          <Tile href="/career/fit-report" icon="spark" title="Career Fit Map" desc="Your top-3 tracks" />
          <Tile href="/college/scholarships" icon="coins" title="Scholarships" desc="Matched to your profile" />
          <Tile href="/career/planner" icon="calendar" title="4-Year Planner" desc="Your roadmap by grade" />
        </motion.div>

        {recs.length > 0 && (
          <motion.div variants={riseItem} style={{ marginTop: "2.4rem" }}>
            <span className="eyebrow">Recommended for you</span>
            <div className={s.recGrid}>
              {recs.map((r) => (
                <Link key={r.tag} href={r.href} className={`${s.rec} surface`}>
                  <span className={s.recIcon}><Icon name={r.icon} size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="tag-mono">{r.tag}</span>
                    <div className={s.recTitle}>{r.title}</div>
                  </div>
                  <span className={s.recMeta}>{r.meta}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
        <motion.div variants={riseItem} className={s.utilRow}>
          <button className={s.utilBtn} onClick={() => { downloadBackup(); toast("Profile backup downloaded."); }}>
            <Icon name="download" size={14} /> Export backup
          </button>
          <button className={s.utilBtn} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Import backup
          </button>
          <button
            className={`${s.utilBtn} ${s.utilDanger}`}
            onClick={() => {
              if (confirm("Start over? This clears your profile and assessment on this device.")) {
                resetAll();
                setJustFinished(false);
                toast("Cleared. Fresh start.", "warn");
              }
            }}
          >
            <Icon name="warning" size={14} /> Start over
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function FirstRunHero() {
  return (
    <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.heroFirst}>
      <motion.span variants={riseItem} className="eyebrow">
        Welcome to DreamCollege
      </motion.span>
      <motion.h1 variants={riseItem} className={s.h1}>
        Let&apos;s map <em className={s.em}>your path</em>.
      </motion.h1>
      <motion.p variants={riseItem} className={s.lead}>
        A few quick questions so everything you see is built around you — not a generic form.
      </motion.p>
    </motion.div>
  );
}

function Stat({
  label, value, decimals = 0, suffix = "", empty = false,
}: { label: string; value: number; decimals?: number; suffix?: string; empty?: boolean }) {
  return (
    <div className={`${s.stat} surface`}>
      <span className={s.statValue}>{empty ? "—" : <CountUp value={value} decimals={decimals} suffix={suffix} />}</span>
      <span className={s.statLabel}>{label}</span>
    </div>
  );
}

function Tile({
  href, icon, title, desc, locked = false, accent = false,
}: { href: string; icon: string; title: string; desc: string; locked?: boolean; accent?: boolean }) {
  return (
    <Link href={href} className={`${s.tile} surface ${accent ? s.tileAccent : ""}`}>
      <span className={s.tileIcon}><Icon name={locked ? "lock" : icon} size={22} /></span>
      <span className={s.tileTitle}>{title}</span>
      <span className={s.tileDesc}>{desc}</span>
      <span className={s.tileArrow}><Icon name="arrow" size={16} /></span>
    </Link>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--hairline)" strokeWidth="9" />
      <motion.circle
        cx="65" cy="65" r={r} fill="none" stroke="var(--marigold)" strokeWidth="9"
        strokeLinecap="round" transform="rotate(-90 65 65)"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: off }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
      <text x="65" y="62" textAnchor="middle" className={s.ringNum}>{pct}%</text>
      <text x="65" y="80" textAnchor="middle" className={s.ringLabel}>complete</text>
    </svg>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function leadFor(mood: string | null) {
  switch (mood) {
    case "overwhelmed": return "One step at a time. We'll keep it simple and always show you exactly what's next.";
    case "behind": return "You're not behind — you're right on time. Let's build momentum together.";
    case "excited": return "Love the energy. Let's turn it into a profile that stands out.";
    default: return "Here's where you stand and the single best thing to do next.";
  }
}
