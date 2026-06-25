"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { INTERESTS } from "@/lib/taxonomy";
import type { Grade, Intake as IntakeType } from "@/lib/types";
import { Icon } from "./Icon";
import { easeOut } from "@/lib/motion";
import s from "./Intake.module.css";

type StepKey = "grade" | "interests" | "goal" | "selectivity" | "mood";

const GOALS: { id: NonNullable<IntakeType["primaryGoal"]>; label: string; sub: string; icon: string }[] = [
  { id: "best_fit_colleges", label: "Find best-fit colleges", sub: "A list matched to me", icon: "building" },
  { id: "explore_careers", label: "Explore careers", sub: "Figure out my direction", icon: "compass" },
  { id: "find_scholarships", label: "Find scholarships", sub: "Money that fits my situation", icon: "coins" },
  { id: "know_my_chances", label: "Know my chances", sub: "An honest admissions read", icon: "gauge" },
];

const MOODS: { id: NonNullable<IntakeType["mood"]>; label: string; emoji: string }[] = [
  { id: "excited", label: "Excited", emoji: "✦" },
  { id: "curious", label: "Curious", emoji: "◇" },
  { id: "overwhelmed", label: "Overwhelmed", emoji: "◌" },
  { id: "behind", label: "A bit behind", emoji: "△" },
];

const SELECTIVITY: { id: NonNullable<IntakeType["targetSelectivity"]>; label: string }[] = [
  { id: "open", label: "Open / Local schools" },
  { id: "selective", label: "Selective" },
  { id: "highly_selective", label: "Highly selective" },
  { id: "most_selective", label: "Most selective (Ivy+)" },
];

export function Intake({ onDone, onLogin }: { onDone: () => void; onLogin?: () => void }) {
  const { profile, setProfile } = useStore();
  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<IntakeType>(profile.intake);

  const steps: StepKey[] = ["grade", "interests", "goal", "selectivity", "mood"];
  const isUnderclassman = draft.grade !== null && draft.grade <= 10;
  const visibleSteps = steps.filter((k) => !(k === "selectivity" && isUnderclassman));
  const key = visibleSteps[stepIdx];
  const total = visibleSteps.length;

  function commit(next: IntakeType) {
    setDraft(next);
  }

  function advance(next: IntakeType) {
    if (stepIdx + 1 >= total) {
      const finished = { ...next, completed: true };
      setProfile((p) => ({
        ...p,
        intake: finished,
        basic: { ...p.basic, schoolYear: next.grade ? `${next.grade}th Grade` : p.basic.schoolYear },
        preference: { ...p.preference, interests: Array.from(new Set([...p.preference.interests, ...next.interests])) },
      }));
      onDone();
    } else {
      setProfile((p) => ({ ...p, intake: next }));
      setStepIdx((i) => i + 1);
    }
  }

  const progress = ((stepIdx + 1) / total) * 100;

  return (
    <div className={s.wrap}>
      {onLogin && (
        <div className={s.loginLink}>
          Returning?{" "}
          <button onClick={onLogin}>Log in</button>
        </div>
      )}
      <div className={s.head}>
        <span className="eyebrow">Get to know you · {stepIdx + 1} of {total}</span>
        <div className={s.track}>
          <motion.div
            className={s.fill}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: easeOut }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: easeOut }}
          className={s.step}
        >
          {key === "grade" && (
            <>
              <h2>What grade are you in?</h2>
              <p>This shapes everything we show you — no wrong answer.</p>
              <div className={s.gradeRow}>
                {([9, 10, 11, 12] as Grade[]).map((g) => (
                  <button
                    key={g}
                    className={s.gradeBtn}
                    data-active={draft.grade === g}
                    onClick={() => advance({ ...draft, grade: g })}
                  >
                    <span className={s.gradeNum}>{g}</span>
                    <span className={s.gradeLabel}>th grade</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {key === "interests" && (
            <>
              <h2>What are you drawn to?</h2>
              <p>Pick a few. We&apos;ll use these to suggest careers, majors, and colleges.</p>
              <div className={s.chipGrid}>
                {INTERESTS.map((it) => {
                  const on = draft.interests.includes(it);
                  return (
                    <button
                      key={it}
                      className="chip"
                      data-selected={on}
                      onClick={() =>
                        commit({
                          ...draft,
                          interests: on ? draft.interests.filter((x) => x !== it) : [...draft.interests, it],
                        })
                      }
                    >
                      {it}
                    </button>
                  );
                })}
              </div>
              <div className={s.actions}>
                <button className="btn btn-primary" disabled={draft.interests.length === 0} onClick={() => advance(draft)}>
                  Continue <Icon name="arrow" size={16} />
                </button>
              </div>
            </>
          )}

          {key === "goal" && (
            <>
              <h2>What brought you here today?</h2>
              <p>We&apos;ll put your next step front and center.</p>
              <div className={s.cardGrid}>
                {GOALS.map((g) => (
                  <button
                    key={g.id}
                    className={s.optCard}
                    data-active={draft.primaryGoal === g.id}
                    onClick={() => advance({ ...draft, primaryGoal: g.id })}
                  >
                    <span className={s.optIcon}><Icon name={g.icon} size={22} /></span>
                    <span className={s.optLabel}>{g.label}</span>
                    <span className={s.optSub}>{g.sub}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {key === "selectivity" && (
            <>
              <h2>Where are you aiming?</h2>
              <p>Just a rough target — we&apos;ll calibrate a real list later.</p>
              <div className={s.stackBtns}>
                {SELECTIVITY.map((o) => (
                  <button
                    key={o.id}
                    className={s.rowBtn}
                    data-active={draft.targetSelectivity === o.id}
                    onClick={() => advance({ ...draft, targetSelectivity: o.id })}
                  >
                    {o.label}
                    <Icon name="arrow" size={16} />
                  </button>
                ))}
              </div>
            </>
          )}

          {key === "mood" && (
            <>
              <h2>How are you feeling about it all?</h2>
              <p>Honest answer — it just helps us set the right tone.</p>
              <div className={s.cardGrid}>
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    className={s.optCard}
                    data-active={draft.mood === m.id}
                    onClick={() => advance({ ...draft, mood: m.id })}
                  >
                    <span className={s.moodEmoji}>{m.emoji}</span>
                    <span className={s.optLabel}>{m.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
