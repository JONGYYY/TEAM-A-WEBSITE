"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { stepVariants, easeOut } from "@/lib/motion";
import { Icon } from "@/components/Icon";
import { Field, TextInput, NumberInput, Select, ChipMulti } from "@/components/fields";
import { Combobox, type ComboOption } from "@/components/Combobox";
import { ResumeImport } from "@/components/ResumeImport";
import { matchAP } from "@/lib/apMatch";
import { tidyText } from "@/lib/autofill";
import {
  GENDERS, SCHOOL_YEARS, FIRST_GEN, INCOME_BANDS, GPA_SCALES, RECOGNITION_LEVELS,
  ACTIVITY_TYPES, INTERESTS, REGIONS, INSTITUTION_TYPES,
  SPECIAL_DESIGNATIONS, CAMPUS_CULTURE, SETTINGS, AID_IMPORTANCE, completionPct,
  NO_PREF, togglePref, searchStates,
  EXAM_TYPES, IB_SUBJECTS, IB_LEVELS, IB_STATUSES, IB_CORE_GRADES, IB_CORE_STATUSES, IB_CAS_STATUSES,
  A_LEVEL_CATEGORIES, A_LEVEL_SUBJECTS, A_LEVEL_LEVELS, A_LEVEL_GRADES, A_LEVEL_STATUSES, EXAM_BOARDS,
} from "@/lib/taxonomy";
import type { StudentProfile, Award, Activity, APEntry, IBEntry, ALevelEntry, IBCore, ExamType } from "@/lib/types";
import s from "./profile.module.css";

const STEPS = [
  "Basic Information", "Education", "Testing", "Preference", "Awards", "Activities", "Review & Generate",
];

// Curated schools the national directory API misses (e.g. junior highs).
// These are surfaced ahead of API results when they match the query.
const LOCAL_SCHOOLS: { name: string; city: string; state: string }[] = [
  { name: "Plano West Jr High", city: "Plano", state: "TX" },
  { name: "Plano West Senior High", city: "Plano", state: "TX" },
];

async function searchSchools(query: string): Promise<ComboOption[]> {
  const q = query.trim().toLowerCase();
  const curated: ComboOption[] = LOCAL_SCHOOLS.filter((sc) => sc.name.toLowerCase().includes(q)).map((sc) => ({
    value: sc.name,
    label: sc.name,
    hint: [sc.city, sc.state].filter(Boolean).join(", "),
  }));

  let api: ComboOption[] = [];
  try {
    const res = await fetch(`/api/schools?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      api = (data.schools ?? []).map((s: { name: string; city: string; state: string }) => ({
        value: s.name,
        label: s.name,
        hint: [s.city, s.state].filter(Boolean).join(", "),
      }));
    }
  } catch {
    /* ignore — curated results still show */
  }

  // Curated first, then API results, de-duped by name.
  const seen = new Set(curated.map((c) => c.value.toLowerCase()));
  return [...curated, ...api.filter((a) => !seen.has(a.value.toLowerCase()))];
}

const AP_MATCH_OPTIONS = (query: string, taken: string[]): ComboOption[] =>
  matchAP(query).filter((sub) => !taken.includes(sub)).map((sub) => ({ value: sub, label: sub }));

const emptyApRow = (): APEntry => ({ subject: "", score: null });
const emptyIbRow = (): IBEntry => ({ subject: "", level: "", score: null, status: "" });
const emptyALevelRow = (): ALevelEntry => ({ category: "", subject: "", level: "", grade: "", status: "", board: "" });

/** Partial profile returned by /api/extract-profile (all fields optional). */
type ResumePartial = {
  basic?: Partial<StudentProfile["basic"]>;
  education?: Partial<StudentProfile["education"]>;
  testing?: {
    examType?: ExamType;
    sat?: number | null;
    act?: number | null;
    ap?: APEntry[];
    ib?: IBEntry[];
    ibCore?: IBCore;
    aLevel?: ALevelEntry[];
  };
  awards?: Award[];
  activities?: Activity[];
};

const blankStr = (v: unknown) => !v || (typeof v === "string" && !v.trim());

/** Merge a résumé-extracted partial into the profile, filling only EMPTY fields. */
function mergeResumePartial(prev: StudentProfile, partial: ResumePartial): StudentProfile {
  const next: StudentProfile = JSON.parse(JSON.stringify(prev));

  // Basic
  const pb = partial.basic || {};
  (["firstName", "middleName", "lastName", "gender", "schoolYear"] as const).forEach((k) => {
    if (blankStr(next.basic[k]) && !blankStr(pb[k])) next.basic[k] = pb[k] as string;
  });
  if (next.basic.gradYear == null && pb.gradYear != null) next.basic.gradYear = pb.gradYear;

  // Education
  const pe = partial.education || {};
  (["school", "country", "state", "city", "gpaScale"] as const).forEach((k) => {
    if (blankStr(next.education[k]) && !blankStr(pe[k])) next.education[k] = pe[k] as string;
  });
  (["classSize", "classRank", "gpaUnweighted", "gpaWeighted"] as const).forEach((k) => {
    if (next.education[k] == null && pe[k] != null) next.education[k] = pe[k] as number;
  });

  // Testing
  const pt = partial.testing;
  if (pt) {
    const t = next.testing;
    const hasAny =
      t.sat != null || t.act != null ||
      t.ap.some((a) => a.subject) || t.ib.some((a) => a.subject) || t.aLevel.some((a) => a.subject);
    if (!hasAny && pt.examType) t.examType = pt.examType;
    if (t.sat == null && pt.sat != null) t.sat = pt.sat;
    if (t.act == null && pt.act != null) t.act = pt.act;
    if (pt.sat != null || pt.act != null) t.noTestsYet = false;
    if (Array.isArray(pt.ap) && pt.ap.length && !t.ap.some((a) => a.subject)) {
      t.ap = [...pt.ap, emptyApRow()];
    }
    if (Array.isArray(pt.ib) && pt.ib.length && !t.ib.some((a) => a.subject)) {
      t.ib = [...pt.ib, emptyIbRow()];
    }
    if (Array.isArray(pt.aLevel) && pt.aLevel.length && !t.aLevel.some((a) => a.subject)) {
      t.aLevel = [...pt.aLevel, emptyALevelRow()];
    }
    if (pt.ibCore) {
      const c = t.ibCore;
      if (blankStr(c.tok.status) && !blankStr(pt.ibCore.tok?.status)) c.tok.status = pt.ibCore.tok.status;
      if (blankStr(c.tok.grade) && !blankStr(pt.ibCore.tok?.grade)) c.tok.grade = pt.ibCore.tok.grade;
      if (blankStr(c.ee.status) && !blankStr(pt.ibCore.ee?.status)) c.ee.status = pt.ibCore.ee.status;
      if (blankStr(c.ee.grade) && !blankStr(pt.ibCore.ee?.grade)) c.ee.grade = pt.ibCore.ee.grade;
      if (blankStr(c.cas.status) && !blankStr(pt.ibCore.cas?.status)) c.cas.status = pt.ibCore.cas.status;
    }
  }

  // Awards — merge new titles, keep what the user already has.
  if (Array.isArray(partial.awards) && partial.awards.length) {
    const existing = next.awards.filter((a) => a.title);
    const seen = new Set(existing.map((a) => a.title.toLowerCase()));
    const merged = [...existing];
    for (const a of partial.awards) {
      if (a.title && !seen.has(a.title.toLowerCase())) { merged.push(a); seen.add(a.title.toLowerCase()); }
    }
    merged.push({ title: "", gradeLevel: "", recognition: "" });
    next.awards = merged;
  }

  // Activities — merge new items, keep user entries.
  if (Array.isArray(partial.activities) && partial.activities.length) {
    const key = (a: Activity) => `${a.organization}|${a.description}`.toLowerCase();
    const existing = next.activities.filter((a) => a.type || a.organization || a.description);
    const seen = new Set(existing.map(key));
    const merged = [...existing];
    for (const a of partial.activities) {
      if ((a.type || a.organization || a.description) && !seen.has(key(a))) { merged.push(a); seen.add(key(a)); }
    }
    merged.push({ type: "", position: "", organization: "", grades: [], weeksPerYear: null, hoursPerWeek: null, description: "" });
    next.activities = merged;
  }

  next.meta = { ...next.meta, resumeApplied: true };
  return next;
}

export default function ProfileBuilder() {
  const { profile, setProfile, setAssessment, hydrated } = useStore();
  const [step, setStep] = useState(profile.meta.lastStep || 1);
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const total = STEPS.length;
  const pct = Math.round((step / total) * 100);
  const grade = profile.intake.grade ?? 11;

  function go(n: number) {
    const clamped = Math.max(1, Math.min(total, n));
    setStep(clamped);
    setProfile((p) => ({ ...p, meta: { ...p.meta, lastStep: clamped } }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      setAssessment(data.report);
      try { sessionStorage.setItem("dc:justGenerated", "1"); } catch { /* ignore */ }
      router.push("/college/assessment");
    } catch {
      setGenerating(false);
    }
  }

  return (
    <div className="container">
      <header className={s.header}>
        <span className="eyebrow">College Profile · Step {step} of {total}</span>
        <h1 className={s.title}>{STEPS[step - 1]}</h1>
        <div className={s.ledger}>
          <motion.div className={s.ledgerFill} animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: easeOut }} />
        </div>
        <nav className={s.stepper} aria-label="Profile sections">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n === step ? "active" : n < step ? "done" : "todo";
            return (
              <button
                key={i}
                type="button"
                className={s.stepItem}
                data-state={state}
                onClick={() => go(n)}
                aria-current={state === "active" ? "step" : undefined}
              >
                <span className={s.stepMark}>{n < step ? <Icon name="check" size={13} /> : n}</span>
                <span className={s.stepLabel}>{label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      <AnimatePresence mode="wait">
        <motion.div key={step} variants={stepVariants} initial="enter" animate="center" exit="exit" className={s.stepBody}>
          {step === 1 && <StepBasic profile={profile} setProfile={setProfile} grade={grade} />}
          {step === 2 && <StepEducation profile={profile} setProfile={setProfile} grade={grade} />}
          {step === 3 && <StepTesting profile={profile} setProfile={setProfile} />}
          {step === 4 && <StepPreference profile={profile} setProfile={setProfile} />}
          {step === 5 && <StepAwards profile={profile} setProfile={setProfile} />}
          {step === 6 && <StepActivities profile={profile} setProfile={setProfile} />}
          {step === 7 && <StepReview profile={profile} setProfile={setProfile} onEdit={go} />}
        </motion.div>
      </AnimatePresence>

      <footer className={s.footer}>
        <button className="btn btn-ghost" onClick={() => go(step - 1)} disabled={step === 1}>
          Back
        </button>
        <span className={s.saved}><Icon name="check" size={14} /> Saved automatically</span>
        {step < total ? (
          <button className="btn btn-primary" onClick={() => go(step + 1)}>
            Continue <Icon name="arrow" size={16} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            {generating ? "Reading your profile…" : "Generate my Admissions Evaluation"}
            {!generating && <Icon name="sparkle" size={16} />}
          </button>
        )}
      </footer>
    </div>
  );
}

type StepProps = { profile: StudentProfile; setProfile: (u: (p: StudentProfile) => StudentProfile) => void; grade?: number };

/* ---------------- Step 1: Basic + Resume autofill ---------------- */
function StepBasic({ profile, setProfile }: StepProps) {
  const b = profile.basic;
  const set = (patch: Partial<typeof b>) => setProfile((p) => ({ ...p, basic: { ...p.basic, ...patch } }));
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [found, setFound] = useState<string[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const highlight = !!profile.meta.resumeApplied;

  async function applyExtract(body: FormData | string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/extract-profile", {
        method: "POST",
        ...(typeof body === "string"
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: body }) }
          : { body }),
      });
      const data = await res.json();
      if (!data.partial) {
        setFound([]);
        // Still mark applied so empty required fields flag for the user.
        setProfile((p) => ({ ...p, meta: { ...p.meta, resumeApplied: true } }));
        return;
      }
      setProfile((p) => mergeResumePartial(p, data.partial));
      setFound(Array.isArray(data.found) ? data.found : []);
    } catch {
      setErr("We couldn't read that file. Try a PDF or DOCX, or paste the text.");
    } finally {
      setBusy(false);
    }
  }

  async function ingestFile(file: File | undefined | null) {
    if (!file) return;
    setFileName(file.name);
    const form = new FormData();
    form.append("file", file);
    await applyExtract(form);
  }

  return (
    <div className={s.card}>
      <div className={s.autofill}>
        <div className={s.autofillHead} onClick={() => setResumeOpen((o) => !o)}>
          <span className={s.autofillIcon}><Icon name="sparkle" size={18} /></span>
          <div>
            <strong>Have a résumé? Upload it once and we&apos;ll fill every step we can.</strong>
            <p className="muted" style={{ fontSize: "0.82rem" }}>Basics, education, testing, awards &amp; activities — anything we can&apos;t find gets flagged in red so you know what to add.</p>
          </div>
          <Icon name={resumeOpen ? "check" : "arrow"} size={16} />
        </div>
        {resumeOpen && (
          <div className={s.autofillBody}>
            <label
              className={s.dropzone}
              data-drag={dragging}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); ingestFile(e.dataTransfer.files?.[0]); }}
            >
              <input
                type="file"
                accept=".txt,.md,.csv,.pdf,.docx"
                style={{ display: "none" }}
                onChange={(e) => ingestFile(e.target.files?.[0])}
              />
              <Icon name="sparkle" size={20} />
              <span>
                {busy
                  ? <>Reading your résumé…</>
                  : fileName
                  ? <><strong>{fileName}</strong> — read. Review your details below.</>
                  : <>Drop a résumé here or <u>browse</u> — we read .txt, .pdf &amp; .docx.</>}
              </span>
            </label>
            <p className="field-hint" style={{ textAlign: "center", margin: "0.5rem 0" }}>or paste the text directly</p>
            <textarea
              className="input"
              rows={5}
              placeholder="Paste your résumé text here…"
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
            <div className="row" style={{ gap: "0.75rem", marginTop: "0.6rem" }}>
              <button className="btn btn-ivy" onClick={() => applyExtract(resumeText)} disabled={!resumeText.trim() || busy}>
                {busy ? "Reading…" : "Autofill my profile"}
              </button>
              {err && <span className={s.foundNote} style={{ color: "var(--clay)" }}>{err}</span>}
              {!err && found && (
                <span className={s.foundNote}>
                  {found.length ? `Filled: ${found.join(" · ")}` : "Nothing detected — no worries, fill it below."}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={s.grid2}>
        <Field label="First name" required invalid={highlight && !b.firstName}><TextInput value={b.firstName} onChange={(v) => set({ firstName: v })} placeholder="Enter first name" /></Field>
        <Field label="Middle name"><TextInput value={b.middleName} onChange={(v) => set({ middleName: v })} placeholder="Middle name" /></Field>
        <Field label="Last name" required invalid={highlight && !b.lastName}><TextInput value={b.lastName} onChange={(v) => set({ lastName: v })} placeholder="Last name" /></Field>
        <Field label="Gender" required invalid={highlight && !b.gender}><Select value={b.gender} onChange={(v) => set({ gender: v })} options={GENDERS} /></Field>
        <Field label="Current school year" required invalid={highlight && !b.schoolYear}><Select value={b.schoolYear} onChange={(v) => set({ schoolYear: v })} options={SCHOOL_YEARS} /></Field>
        <Field label="Graduation year" required invalid={highlight && !b.gradYear}><Select value={b.gradYear ? String(b.gradYear) : ""} onChange={(v) => set({ gradYear: Number(v) })} options={["2026", "2027", "2028", "2029", "2030", "2031"]} /></Field>
      </div>

      <div className={s.sensitive}>
        <Field label="First-generation college student?"><Select value={b.firstGen} onChange={(v) => set({ firstGen: v })} options={FIRST_GEN} /></Field>
        <Field label="Family income (US $) — optional">
          <Select value={b.familyIncomeBand} onChange={(v) => set({ familyIncomeBand: v })} options={INCOME_BANDS} />
        </Field>
        <div className="privacy-note">
          <Icon name="shield" size={16} />
          <span>Used only to match financial aid &amp; scholarships. Stored on your device — never shared. Both fields are optional.</span>
        </div>
        <label className={s.checkRow}>
          <input type="checkbox" checked={b.incomeOptIn} onChange={(e) => set({ incomeOptIn: e.target.checked })} />
          Use my income to match scholarships
        </label>
      </div>
    </div>
  );
}

/* GPA placeholders + input bounds adapt to the selected scale */
function gpaExamples(scale: string): { unw: string; w: string; maxU?: number; maxW?: number; step: number } {
  switch (scale) {
    case "5.0":
      return { unw: "e.g. 4.6", w: "e.g. 4.9", maxU: 5, maxW: 6, step: 0.01 };
    case "100":
      return { unw: "e.g. 95", w: "e.g. 98", maxU: 100, maxW: 110, step: 0.1 };
    case "Other":
      return { unw: "Your GPA", w: "Weighted GPA", maxU: undefined, maxW: undefined, step: 0.01 };
    default: // 4.0
      return { unw: "e.g. 3.95", w: "e.g. 4.61", maxU: 5, maxW: 6, step: 0.01 };
  }
}

/* ---------------- Step 2: Education ---------------- */
function StepEducation({ profile, setProfile, grade }: StepProps) {
  const e = profile.education;
  const set = (patch: Partial<typeof e>) => setProfile((p) => ({ ...p, education: { ...p.education, ...patch } }));
  const optional = (grade ?? 11) <= 10;
  const gpaEx = gpaExamples(e.gpaScale);
  // Only flag once a résumé has been applied, and never for underclassmen where academics are optional.
  const highlight = !!profile.meta.resumeApplied && !optional;

  return (
    <div className={s.card}>
      {optional && (
        <div className="privacy-note" style={{ borderStyle: "solid" }}>
          <Icon name="spark" size={16} />
          <span>You&apos;re early in high school — academic details are optional. Add what you have; come back anytime.</span>
        </div>
      )}
      <div className={s.grid2}>
        <Field label="School name" hint="Start typing — pick from the list or enter your own" invalid={highlight && !e.school}>
          <Combobox
            value={e.school}
            onChange={(v) => set({ school: v })}
            placeholder="e.g. Plano West Senior High"
            debounceMs={220}
            minChars={2}
            emptyHint="No schools found — keep typing or use your own"
            getOptions={searchSchools}
          />
        </Field>
        <Field label="Country"><TextInput value={e.country} onChange={(v) => set({ country: v })} placeholder="Country" /></Field>
        <Field label="State / Province" hint="Type part of a state — e.g. “penn”, “NY”" invalid={highlight && !e.state}>
          <Combobox
            value={e.state}
            onChange={(v) => set({ state: v })}
            placeholder="e.g. Texas"
            minChars={0}
            emptyHint="No matching state — you can type your own"
            getOptions={(q) => searchStates(q)}
          />
        </Field>
        <Field label="City"><TextInput value={e.city} onChange={(v) => set({ city: v })} placeholder="City" /></Field>
        <Field label="Graduating class size" hint="Approximate — must be 0 or more">
          {e.classSizeUnknown ? (
            <div className="muted" style={{ padding: "0.65rem 0" }}>Unknown</div>
          ) : (
            <NumberInput value={e.classSize} onChange={(v) => set({ classSize: v })} placeholder="e.g. 1390" min={0} />
          )}
          <label className={s.checkRow} style={{ marginTop: "0.4rem" }}>
            <input type="checkbox" checked={e.classSizeUnknown} onChange={(ev) => set({ classSizeUnknown: ev.target.checked, classSize: ev.target.checked ? null : e.classSize })} />
            I don&apos;t know my class size
          </label>
        </Field>
        <Field label="Class ranking">
          {e.rankUnknown ? (
            <div className="muted" style={{ padding: "0.65rem 0" }}>Not ranked / unknown</div>
          ) : (
            <NumberInput value={e.classRank} onChange={(v) => set({ classRank: v })} placeholder="e.g. 6" min={0} />
          )}
          <label className={s.checkRow} style={{ marginTop: "0.4rem" }}>
            <input type="checkbox" checked={e.rankUnknown} onChange={(ev) => set({ rankUnknown: ev.target.checked, classRank: ev.target.checked ? null : e.classRank })} />
            My school doesn&apos;t rank / I don&apos;t know
          </label>
        </Field>
        <Field label="GPA scale"><Select value={e.gpaScale} onChange={(v) => set({ gpaScale: v })} options={GPA_SCALES} placeholder="4.0" /></Field>
        <Field label="Unweighted GPA" invalid={highlight && e.gpaUnweighted == null}><NumberInput value={e.gpaUnweighted} onChange={(v) => set({ gpaUnweighted: v })} placeholder={gpaEx.unw} min={0} max={gpaEx.maxU} step={gpaEx.step} /></Field>
        <Field label="Weighted GPA"><NumberInput value={e.gpaWeighted} onChange={(v) => set({ gpaWeighted: v })} placeholder={gpaEx.w} min={0} max={gpaEx.maxW} step={gpaEx.step} /></Field>
      </div>
    </div>
  );
}

/* ---------------- Step 3: Testing ---------------- */
const IB_SUBJECT_OPTIONS = (query: string, taken: string[]): ComboOption[] => {
  const q = query.trim().toLowerCase();
  return IB_SUBJECTS.filter((sub) => !taken.includes(sub) && (!q || sub.toLowerCase().includes(q))).map((sub) => ({ value: sub, label: sub }));
};
const A_LEVEL_SUBJECT_OPTIONS = (query: string): ComboOption[] => {
  const q = query.trim().toLowerCase();
  return A_LEVEL_SUBJECTS.filter((sub) => !q || sub.toLowerCase().includes(q)).map((sub) => ({ value: sub, label: sub }));
};

function StepTesting({ profile, setProfile }: StepProps) {
  const t = profile.testing;
  const highlight = !!profile.meta.resumeApplied;
  const set = (patch: Partial<typeof t>) => setProfile((p) => ({ ...p, testing: { ...p.testing, ...patch } }));

  const hasAnyTest =
    t.sat != null || t.act != null ||
    t.ap.some((a) => a.subject) || t.ib.some((a) => a.subject) || t.aLevel.some((a) => a.subject);
  const testingInvalid = highlight && !t.noTestsYet && !hasAnyTest;

  /* ---- AP ---- */
  const chosenAp = t.ap.map((a) => a.subject).filter(Boolean);
  function setAp(idx: number, patch: Partial<APEntry>) {
    setProfile((p) => {
      const ap = p.testing.ap.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      if (idx === ap.length - 1 && (patch.subject ?? ap[idx].subject)) ap.push(emptyApRow());
      return { ...p, testing: { ...p.testing, ap } };
    });
  }
  function removeAp(idx: number) {
    setProfile((p) => {
      let ap = p.testing.ap.filter((_, i) => i !== idx);
      if (ap.length === 0 || ap[ap.length - 1].subject) ap = [...ap, emptyApRow()];
      return { ...p, testing: { ...p.testing, ap } };
    });
  }

  /* ---- IB subjects ---- */
  const chosenIb = t.ib.map((a) => a.subject).filter(Boolean);
  function setIb(idx: number, patch: Partial<IBEntry>) {
    setProfile((p) => {
      const ib = p.testing.ib.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      if (idx === ib.length - 1 && (patch.subject ?? ib[idx].subject)) ib.push(emptyIbRow());
      return { ...p, testing: { ...p.testing, ib } };
    });
  }
  function removeIb(idx: number) {
    setProfile((p) => {
      let ib = p.testing.ib.filter((_, i) => i !== idx);
      if (ib.length === 0 || ib[ib.length - 1].subject) ib = [...ib, emptyIbRow()];
      return { ...p, testing: { ...p.testing, ib } };
    });
  }
  function setCore(part: keyof IBCore, patch: Record<string, string>) {
    setProfile((p) => ({ ...p, testing: { ...p.testing, ibCore: { ...p.testing.ibCore, [part]: { ...p.testing.ibCore[part], ...patch } } } }));
  }

  /* ---- A-Level ---- */
  function setAl(idx: number, patch: Partial<ALevelEntry>) {
    setProfile((p) => {
      const aLevel = p.testing.aLevel.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      if (idx === aLevel.length - 1 && (patch.subject ?? aLevel[idx].subject)) aLevel.push(emptyALevelRow());
      return { ...p, testing: { ...p.testing, aLevel } };
    });
  }
  function removeAl(idx: number) {
    setProfile((p) => {
      let aLevel = p.testing.aLevel.filter((_, i) => i !== idx);
      if (aLevel.length === 0 || aLevel[aLevel.length - 1].subject) aLevel = [...aLevel, emptyALevelRow()];
      return { ...p, testing: { ...p.testing, aLevel } };
    });
  }

  return (
    <div className={s.card}>
      <label className={s.checkRow} style={{ marginBottom: "1rem" }}>
        <input type="checkbox" checked={t.noTestsYet} onChange={(e) => set({ noTestsYet: e.target.checked })} />
        I haven&apos;t taken any standardized tests yet
      </label>
      {testingInvalid && (
        <p className="field-needs" style={{ marginBottom: "1rem" }}>Add a score or at least one subject — or check the box above if you haven&apos;t tested yet.</p>
      )}

      {!t.noTestsYet && (
        <>
          <div className={s.grid2}>
            <Field label="SAT score" hint="400–1600"><NumberInput value={t.sat} onChange={(v) => set({ sat: v })} placeholder="e.g. 1590" min={400} max={1600} /></Field>
            <Field label="ACT score" hint="1–36"><NumberInput value={t.act} onChange={(v) => set({ act: v })} placeholder="e.g. 35" min={1} max={36} /></Field>
          </div>

          <div className={s.subhead}>Subject exams</div>
          <p className="field-hint" style={{ marginBottom: "0.7rem" }}>Choose the exam system you take. You can enter AP, IB, or A-Level subjects.</p>
          <div className={s.examTabs} role="tablist" aria-label="Exam system">
            {EXAM_TYPES.map((ex) => (
              <button
                key={ex.id}
                type="button"
                role="tab"
                className={s.examTab}
                data-active={t.examType === ex.id}
                aria-selected={t.examType === ex.id}
                onClick={() => set({ examType: ex.id })}
              >
                {ex.label}
              </button>
            ))}
          </div>

          {t.examType === "AP" && (
            <>
              <div className={s.apList}>
                {t.ap.map((a, i) => {
                  const taken = chosenAp.filter((sub) => sub !== a.subject);
                  return (
                    <div key={i} className={s.apRow}>
                      <Combobox
                        value={a.subject}
                        onChange={(v) => setAp(i, { subject: v })}
                        placeholder="Pick or type (e.g. lang, gov, calc bc)"
                        minChars={0}
                        allowFreeText={false}
                        preferUp
                        emptyHint="No matching AP — try a shorter word"
                        getOptions={(q) => AP_MATCH_OPTIONS(q, taken)}
                      />
                      <select className="select" style={{ maxWidth: 120 }} value={a.score ?? ""} onChange={(e) => setAp(i, { score: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Score</option>
                        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      {a.subject ? (
                        <button type="button" className={s.removeBtn} onClick={() => removeAp(i)} aria-label={`Remove ${a.subject}`}>×</button>
                      ) : (
                        <span className={s.removeSpacer} aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="field-hint">Type any shorthand — “lang”, “ap gov”, “calc bc” all work. A new row appears automatically; you can&apos;t pick the same subject twice.</p>
            </>
          )}

          {t.examType === "IB" && (
            <>
              <div className={s.ibCore}>
                <div className={s.subhead} style={{ margin: "0 0 0.8rem" }}>IB Core</div>
                <div className={s.ibCoreRow}>
                  <span className={s.ibCoreLabel}>Theory of Knowledge (TOK)<span className={s.ibCoreHint}>Graded A–E; contributes bonus points</span></span>
                  <select className="select" value={t.ibCore.tok.status} onChange={(e) => setCore("tok", { status: e.target.value })}>
                    <option value="">Status</option>
                    {IB_CORE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select className="select" value={t.ibCore.tok.grade} onChange={(e) => setCore("tok", { grade: e.target.value })}>
                    <option value="">Grade</option>
                    {IB_CORE_GRADES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className={s.ibCoreRow}>
                  <span className={s.ibCoreLabel}>Extended Essay (EE)<span className={s.ibCoreHint}>Graded A–E; contributes bonus points</span></span>
                  <select className="select" value={t.ibCore.ee.status} onChange={(e) => setCore("ee", { status: e.target.value })}>
                    <option value="">Status</option>
                    {IB_CORE_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select className="select" value={t.ibCore.ee.grade} onChange={(e) => setCore("ee", { grade: e.target.value })}>
                    <option value="">Grade</option>
                    {IB_CORE_GRADES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className={s.ibCoreRow}>
                  <span className={s.ibCoreLabel}>Creativity, Activity, Service (CAS)<span className={s.ibCoreHint}>Pass/complete — not graded</span></span>
                  <select className="select" value={t.ibCore.cas.status} onChange={(e) => setCore("cas", { status: e.target.value })}>
                    <option value="">Status</option>
                    {IB_CAS_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span aria-hidden />
                </div>
              </div>

              <div className={s.subhead} style={{ marginTop: "1rem" }}>IB subjects</div>
              <div className={s.apList}>
                {t.ib.map((a, i) => {
                  const taken = chosenIb.filter((sub) => sub !== a.subject);
                  return (
                    <div key={i} className={s.ibRow}>
                      <Combobox
                        value={a.subject}
                        onChange={(v) => setIb(i, { subject: v })}
                        placeholder="Search IB subject"
                        minChars={0}
                        preferUp
                        emptyHint="No matching subject — you can type your own"
                        getOptions={(q) => IB_SUBJECT_OPTIONS(q, taken)}
                      />
                      <select className="select" value={a.level} onChange={(e) => setIb(i, { level: e.target.value as IBEntry["level"] })}>
                        <option value="">Level</option>
                        {IB_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select className="select" value={a.score ?? ""} onChange={(e) => setIb(i, { score: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">Score</option>
                        {[7, 6, 5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select className="select" value={a.status} onChange={(e) => setIb(i, { status: e.target.value })}>
                        <option value="">Status</option>
                        {IB_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {a.subject ? (
                        <button type="button" className={s.removeBtn} onClick={() => removeIb(i)} aria-label={`Remove ${a.subject}`}>×</button>
                      ) : (
                        <span className={s.removeSpacer} aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="field-hint">IB subjects are scored 1–7. A new row appears automatically as you add subjects.</p>
            </>
          )}

          {t.examType === "A-Level" && (
            <>
              <div className={s.apList}>
                {t.aLevel.map((a, i) => (
                  <div key={i} className={s.aLevelRow}>
                    <select className="select" value={a.category} onChange={(e) => setAl(i, { category: e.target.value })}>
                      <option value="">Category</option>
                      {A_LEVEL_CATEGORIES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <Combobox
                      value={a.subject}
                      onChange={(v) => setAl(i, { subject: v })}
                      placeholder="Search subject"
                      minChars={0}
                      preferUp
                      emptyHint="No matching subject — you can type your own"
                      getOptions={A_LEVEL_SUBJECT_OPTIONS}
                    />
                    <select className="select" value={a.level} onChange={(e) => setAl(i, { level: e.target.value as ALevelEntry["level"] })}>
                      <option value="">Level</option>
                      {A_LEVEL_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select className="select" value={a.grade} onChange={(e) => setAl(i, { grade: e.target.value })}>
                      <option value="">Grade</option>
                      {A_LEVEL_GRADES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select className="select" value={a.status} onChange={(e) => setAl(i, { status: e.target.value })}>
                      <option value="">Status</option>
                      {A_LEVEL_STATUSES.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select className="select" value={a.board} onChange={(e) => setAl(i, { board: e.target.value })}>
                      <option value="">Exam board</option>
                      {EXAM_BOARDS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {a.subject ? (
                      <button type="button" className={s.removeBtn} onClick={() => removeAl(i)} aria-label={`Remove ${a.subject}`}>×</button>
                    ) : (
                      <span className={s.removeSpacer} aria-hidden />
                    )}
                  </div>
                ))}
              </div>
              <p className="field-hint">A-Levels are graded A*–E. Add each subject with its level and exam board. A new row appears automatically.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Step 4: Preference ---------------- */
function StepPreference({ profile, setProfile }: StepProps) {
  const pr = profile.preference;

  const toggle = (key: keyof typeof pr, v: string, withNoPref: boolean) =>
    setProfile((p) => {
      const arr = p.preference[key] as string[];
      const nextArr = withNoPref ? togglePref(arr, v) : (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
      return { ...p, preference: { ...p.preference, [key]: nextArr } };
    });

  return (
    <div className={s.card}>
      <p className="field-hint" style={{ marginBottom: "1.4rem" }}>
        Pick what matters to you. Anything you skip just won&apos;t narrow your matches — choose “No preference” to keep options wide open.
      </p>

      <div className={s.prefGroups}>
        <PrefGroup title="Academic interests" note="Drives your major, career, and college matches">
          <ChipMulti options={INTERESTS} selected={pr.interests} onToggle={(v) => toggle("interests", v, false)} />
        </PrefGroup>

        <PrefGroup title="Preferred regions" note="Where you'd like to study">
          <ChipMulti options={[...REGIONS, NO_PREF]} selected={pr.regions} onToggle={(v) => toggle("regions", v, true)} />
        </PrefGroup>

        <PrefGroup title="Type of institution">
          <ChipMulti options={[...INSTITUTION_TYPES, NO_PREF]} selected={pr.institutionType} onToggle={(v) => toggle("institutionType", v, true)} />
        </PrefGroup>

        <PrefGroup title="Campus setting">
          <ChipMulti options={[...SETTINGS, NO_PREF]} selected={pr.setting} onToggle={(v) => toggle("setting", v, true)} />
        </PrefGroup>

        <PrefGroup title="Campus culture" note="The vibe you're looking for">
          <ChipMulti options={[...CAMPUS_CULTURE, NO_PREF]} selected={pr.campusCulture} onToggle={(v) => toggle("campusCulture", v, true)} />
        </PrefGroup>

        <PrefGroup title="Special designations" note="Optional — communities you're interested in">
          <ChipMulti options={[...SPECIAL_DESIGNATIONS, NO_PREF]} selected={pr.specialDesignation} onToggle={(v) => toggle("specialDesignation", v, true)} />
        </PrefGroup>

        <PrefGroup title="How important is financial aid?">
          <div style={{ maxWidth: 320 }}>
            <Select value={pr.financialAidImportance} onChange={(v) => setProfile((p) => ({ ...p, preference: { ...p.preference, financialAidImportance: v } }))} options={AID_IMPORTANCE} />
          </div>
        </PrefGroup>
      </div>
    </div>
  );
}

function PrefGroup({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={s.prefGroup}>
      <div className={s.prefGroupHead}>
        <span className={s.prefGroupTitle}>{title}</span>
        {note && <span className={s.prefGroupNote}>{note}</span>}
      </div>
      {children}
    </section>
  );
}

/* ---------------- Step 5: Awards ---------------- */
function StepAwards({ profile, setProfile }: StepProps) {
  function setAward(idx: number, patch: Partial<(typeof profile.awards)[number]>) {
    setProfile((p) => {
      const awards = p.awards.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      if (idx === awards.length - 1 && (awards[idx].title || awards[idx].recognition)) {
        awards.push({ title: "", gradeLevel: "", recognition: "" });
      }
      return { ...p, awards };
    });
  }
  function remove(idx: number) {
    setProfile((p) => ({ ...p, awards: p.awards.length > 1 ? p.awards.filter((_, i) => i !== idx) : p.awards }));
  }

  function importAwards(incoming: typeof profile.awards) {
    setProfile((p) => {
      const existing = p.awards.filter((a) => a.title);
      const seen = new Set(existing.map((a) => a.title.toLowerCase()));
      const merged = [...existing];
      for (const a of incoming) {
        if (a.title && !seen.has(a.title.toLowerCase())) { merged.push(a); seen.add(a.title.toLowerCase()); }
      }
      merged.push({ title: "", gradeLevel: "", recognition: "" });
      return { ...p, awards: merged };
    });
  }

  const needsAward = !!profile.meta.resumeApplied && !profile.awards.some((a) => a.title);

  return (
    <div className={s.card}>
      <ResumeImport target="awards" label="Import awards from your résumé" onExtract={(r) => importAwards(r.awards)} />
      {needsAward ? (
        <p className="field-needs" style={{ marginBottom: "1rem" }}>Your résumé didn&apos;t list any awards — add at least one honor below, or continue if you have none.</p>
      ) : (
        <p className="field-hint" style={{ marginBottom: "1rem" }}>Add honors and awards. A new row appears as you go — empty rows are ignored.</p>
      )}
      {profile.awards.map((a, i) => (
        <div key={i} className={s.repeatRow}>
          <TextInput value={a.title} onChange={(v) => setAward(i, { title: v })} placeholder="Award / honor" />
          <Select value={a.gradeLevel} onChange={(v) => setAward(i, { gradeLevel: v })} options={["9th", "10th", "11th", "12th"]} placeholder="Grade" />
          <Select value={a.recognition} onChange={(v) => setAward(i, { recognition: v })} options={RECOGNITION_LEVELS} placeholder="Level" />
          <button className={s.removeBtn} onClick={() => remove(i)} aria-label="Remove">×</button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Step 6: Activities ---------------- */
function StepActivities({ profile, setProfile }: StepProps) {
  const [tidying, setTidying] = useState<number | null>(null);
  const needsActivity = !!profile.meta.resumeApplied && !profile.activities.some((a) => a.type || a.organization || a.description);

  function setAct(idx: number, patch: Partial<(typeof profile.activities)[number]>) {
    setProfile((p) => {
      const activities = p.activities.map((a, i) => (i === idx ? { ...a, ...patch } : a));
      if (idx === activities.length - 1 && (activities[idx].type || activities[idx].organization || activities[idx].description)) {
        activities.push({ type: "", position: "", organization: "", grades: [], weeksPerYear: null, hoursPerWeek: null, description: "" });
      }
      return { ...p, activities };
    });
  }
  function toggleGrade(idx: number, g: string) {
    setProfile((p) => ({
      ...p,
      activities: p.activities.map((a, i) =>
        i === idx ? { ...a, grades: a.grades.includes(g) ? a.grades.filter((x) => x !== g) : [...a.grades, g] } : a
      ),
    }));
  }
  function remove(idx: number) {
    setProfile((p) => ({ ...p, activities: p.activities.length > 1 ? p.activities.filter((_, i) => i !== idx) : p.activities }));
  }

  function importActivities(incoming: typeof profile.activities) {
    setProfile((p) => {
      const key = (a: (typeof profile.activities)[number]) => `${a.organization}|${a.description}`.toLowerCase();
      const existing = p.activities.filter((a) => a.type || a.organization || a.description);
      const seen = new Set(existing.map(key));
      const merged = [...existing];
      for (const a of incoming) {
        if ((a.type || a.organization || a.description) && !seen.has(key(a))) { merged.push(a); seen.add(key(a)); }
      }
      merged.push({ type: "", position: "", organization: "", grades: [], weeksPerYear: null, hoursPerWeek: null, description: "" });
      return { ...p, activities: merged };
    });
  }

  // AI-rewrite a description to <=150 chars (preserving meaning); falls back to
  // a clean truncation offline or on error.
  async function tidyDescription(idx: number, text: string) {
    if (!text.trim()) return;
    setTidying(idx);
    try {
      const res = await fetch("/api/tidy-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      const out = String(data.description || "").trim() || tidyText(text, 150);
      setAct(idx, { description: out });
    } catch {
      setAct(idx, { description: tidyText(text, 150) });
    } finally {
      setTidying(null);
    }
  }

  return (
    <div className={s.card}>
      <ResumeImport target="activities" label="Import activities from your résumé" onExtract={(r) => importActivities(r.activities)} />
      {needsActivity ? (
        <p className="field-needs" style={{ marginBottom: "1rem" }}>Your résumé didn&apos;t list any activities — add at least one below so we can evaluate your involvement.</p>
      ) : (
        <p className="field-hint" style={{ marginBottom: "1rem" }}>Paste long descriptions freely — use “Tidy with AI” to rewrite them under the 150-character limit.</p>
      )}
      {profile.activities.map((a, i) => {
        const count = a.description.length;
        return (
          <div key={i} className={s.actCard}>
            <div className={s.actTop}>
              <Select value={a.type} onChange={(v) => setAct(i, { type: v })} options={ACTIVITY_TYPES} placeholder="Activity type" />
              <button className={s.removeBtn} onClick={() => remove(i)} aria-label="Remove">×</button>
            </div>
            <div className={s.grid2}>
              <TextInput value={a.position} onChange={(v) => setAct(i, { position: v })} placeholder="Position / leadership (e.g. President)" />
              <TextInput value={a.organization} onChange={(v) => setAct(i, { organization: v })} placeholder="Organization" />
            </div>
            <div className={s.actMeta}>
              <div className={s.gradeChips}>
                {["9th", "10th", "11th", "12th"].map((g) => (
                  <button key={g} type="button" className="chip" data-selected={a.grades.includes(g)} onClick={() => toggleGrade(i, g)}>{g}</button>
                ))}
              </div>
              <div className={s.numPair}>
                <NumberInput value={a.weeksPerYear} onChange={(v) => setAct(i, { weeksPerYear: v })} placeholder="Weeks/yr" min={0} max={52} />
                <NumberInput value={a.hoursPerWeek} onChange={(v) => setAct(i, { hoursPerWeek: v })} placeholder="Hrs/wk" min={0} max={168} />
              </div>
            </div>
            <textarea
              className="input"
              rows={2}
              value={a.description}
              placeholder="Describe responsibilities, honors, or key achievements…"
              onChange={(e) => setAct(i, { description: e.target.value })}
            />
            <div className={s.actFooter}>
              <span className={count > 150 ? s.countOver : s.count}>{count}/150</span>
              <button className="btn btn-ghost" style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }} onClick={() => tidyDescription(i, a.description)} disabled={count === 0 || tidying === i}>
                <Icon name="sparkle" size={14} /> {tidying === i ? "Rewriting…" : "Tidy with AI"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Step 7: Review & Generate ---------------- */
function StepReview({ profile, setProfile, onEdit }: StepProps & { onEdit: (n: number) => void }) {
  const pct = completionPct(profile);
  const acts = profile.activities.filter((a) => a.type || a.organization);
  const awards = profile.awards.filter((a) => a.title);

  return (
    <div className={s.card}>
      <div className={s.reviewGrid}>
        <ReviewItem step={1} title="Basic" onEdit={onEdit} lines={[`${profile.basic.firstName} ${profile.basic.lastName}`.trim() || "—", profile.basic.schoolYear || "—"]} />
        <ReviewItem step={2} title="Education" onEdit={onEdit} lines={[profile.education.school || "—", profile.education.gpaUnweighted ? `GPA ${profile.education.gpaUnweighted}` : "GPA —"]} />
        <ReviewItem step={3} title="Testing" onEdit={onEdit} lines={[profile.testing.sat ? `SAT ${profile.testing.sat}` : profile.testing.act ? `ACT ${profile.testing.act}` : "No scores", testingSummary(profile.testing)]} />
        <ReviewItem step={4} title="Preference" onEdit={onEdit} lines={[`${profile.preference.interests.length} interests`, `${profile.preference.regions.length} regions`]} />
        <ReviewItem step={5} title="Awards" onEdit={onEdit} lines={[`${awards.length} awards`]} />
        <ReviewItem step={6} title="Activities" onEdit={onEdit} lines={[`${acts.length} activities`]} />
      </div>

      <div className={s.consent}>
        <div className="row" style={{ gap: "0.6rem", marginBottom: "0.5rem" }}>
          <Icon name="shield" size={18} />
          <strong>Before we generate your evaluation</strong>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
          Your profile stays on your device. We send it to the evaluation model to produce your committee-style report, then store the result locally. Nothing is shared with third parties.
        </p>
        <label className={s.checkRow}>
          <input type="checkbox" checked={profile.basic.incomeOptIn} onChange={(e) => setProfile((p) => ({ ...p, basic: { ...p.basic, incomeOptIn: e.target.checked } }))} />
          Include financial context in aid &amp; scholarship matching
        </label>
      </div>

      {pct < 50 && (
        <div className="privacy-note" style={{ borderColor: "var(--clay)", color: "var(--clay)" }}>
          <Icon name="warning" size={16} />
          <span>Your profile is light ({pct}%). The evaluation works best with academics, activities, and awards filled in.</span>
        </div>
      )}
    </div>
  );
}

function testingSummary(t: StudentProfile["testing"]): string {
  if (t.examType === "IB") {
    const n = t.ib.filter((a) => a.subject).length;
    return `${n} IB subject${n === 1 ? "" : "s"}`;
  }
  if (t.examType === "A-Level") {
    const n = t.aLevel.filter((a) => a.subject).length;
    return `${n} A-Level${n === 1 ? "" : "s"}`;
  }
  const n = t.ap.filter((a) => a.subject).length;
  return `${n} AP`;
}

function ReviewItem({ step, title, lines, onEdit }: { step: number; title: string; lines: string[]; onEdit: (n: number) => void }) {
  return (
    <div className={s.reviewItem}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="tag-mono">{title}</span>
        <button className={s.editLink} onClick={() => onEdit(step)}>Edit</button>
      </div>
      {lines.map((l, i) => <div key={i} className={s.reviewLine}>{l}</div>)}
    </div>
  );
}
