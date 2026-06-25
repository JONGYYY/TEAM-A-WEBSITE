"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Icon } from "./Icon";
import { staggerParent, riseItem, easeOut } from "@/lib/motion";
import s from "./AuthScreen.module.css";

const GOAL_HOOK: Record<string, string> = {
  best_fit_colleges: "your matched college list",
  explore_careers: "your top-3 career tracks",
  find_scholarships: "scholarships matched to you",
  know_my_chances: "your Admissions Evaluation",
};

export function AuthScreen({
  initialMode = "signup",
  onAuthed,
  onGuest,
}: {
  initialMode?: "signup" | "login";
  onAuthed: () => void;
  onGuest?: () => void;
}) {
  const { signup, login } = useAuth();
  const { profile } = useStore();
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const grade = profile.intake.grade;
  const goalHook = profile.intake.primaryGoal ? GOAL_HOOK[profile.intake.primaryGoal] : "your personalized plan";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = mode === "signup" ? signup(name, email, password) : login(email, password);
    setBusy(false);
    if (res.ok) onAuthed();
    else setError(res.error ?? "Something went wrong.");
  }

  return (
    <div className={s.wrap}>
      {/* Value panel */}
      <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.pitch}>
        <motion.span variants={riseItem} className="eyebrow">
          {mode === "signup" ? "Last step — and it's quick" : "Welcome back"}
        </motion.span>
        <motion.h1 variants={riseItem} className={s.h1}>
          {mode === "signup" ? (
            <>Save your plan,<br /><em className={s.em}>{grade ? `Grade ${grade} you` : "future grad"}</em>.</>
          ) : (
            <>Pick up<br />where <em className={s.em}>you left off</em>.</>
          )}
        </motion.h1>
        <motion.p variants={riseItem} className={s.sub}>
          {mode === "signup"
            ? <>Create a free account to keep your answers and unlock <strong>{goalHook}</strong>. No re-entering anything — ever.</>
            : "Log in to see your saved profile, plan, and evaluation."}
        </motion.p>

        {mode === "signup" && (
          <motion.ul variants={riseItem} className={s.benefits}>
            <li><span className={s.check}><Icon name="check" size={14} /></span> Your progress saves automatically</li>
            <li><span className={s.check}><Icon name="check" size={14} /></span> Unlock {goalHook}</li>
            <li><span className={s.check}><Icon name="check" size={14} /></span> Pick up on any device, anytime</li>
            <li><span className={s.check}><Icon name="check" size={14} /></span> Private by default — your data stays yours</li>
          </motion.ul>
        )}
      </motion.div>

      {/* Form card */}
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, ease: easeOut, delay: 0.1 }} className={`${s.card} surface`}>
        <form onSubmit={submit} className={s.form}>
          {mode === "signup" && (
            <label className={s.field}>
              <span className="field-label">First name</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" autoComplete="given-name" />
            </label>
          )}
          <label className={s.field}>
            <span className="field-label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" />
          </label>
          <label className={s.field}>
            <span className="field-label">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "At least 6 characters" : "Your password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </label>

          {error && <div className={s.error}><Icon name="warning" size={14} /> {error}</div>}

          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: "0.4rem" }}>
            {mode === "signup" ? "Create my free account" : "Log in"} <Icon name="arrow" size={16} />
          </button>

          {mode === "signup" && (
            <p className={s.trust}><Icon name="shield" size={13} /> Free forever · stored on your device · no spam</p>
          )}
        </form>

        <div className={s.switch}>
          {mode === "signup" ? (
            <>Already have an account? <button onClick={() => { setMode("login"); setError(null); }}>Log in</button></>
          ) : (
            <>New here? <button onClick={() => { setMode("signup"); setError(null); }}>Create an account</button></>
          )}
        </div>

        {onGuest && mode === "signup" && (
          <button className={s.guest} onClick={onGuest}>I&apos;ll do this later — keep exploring</button>
        )}
      </motion.div>
    </div>
  );
}
