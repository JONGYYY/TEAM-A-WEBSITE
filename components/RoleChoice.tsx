"use client";

import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import type { Role } from "@/lib/auth";
import s from "./RoleChoice.module.css";

const ROLES: { id: Role; icon: string; title: string; desc: string }[] = [
  {
    id: "student",
    icon: "user",
    title: "I'm a student",
    desc: "Build your profile, get matched to best-fit majors & colleges, and take quizzes your counselor assigns.",
  },
  {
    id: "counselor",
    icon: "grad",
    title: "I'm a counselor",
    desc: "Create quizzes & surveys, assign them to students or whole groups, and track results in one place.",
  },
];

/**
 * First step of onboarding: pick student vs counselor. Counselors skip the
 * student intake and go straight to creating their account.
 */
export function RoleChoice({ onChoose, onLogin }: { onChoose: (role: Role) => void; onLogin: () => void }) {
  return (
    <div className={s.wrap}>
      <motion.div variants={staggerParent} initial="hidden" animate="show" className={s.inner}>
        <motion.span variants={riseItem} className="eyebrow">Welcome to DreamCollege</motion.span>
        <motion.h1 variants={riseItem} className={s.h1}>
          Who are you here <em className={s.em}>as</em>?
        </motion.h1>
        <motion.p variants={riseItem} className={s.sub}>
          Pick one so everything you see is built around you. It takes a second — and it shapes the whole experience.
        </motion.p>

        <motion.div variants={riseItem} className={s.cards}>
          {ROLES.map((r) => (
            <button key={r.id} type="button" className={`${s.card} surface`} onClick={() => onChoose(r.id)}>
              <span className={s.icon}><Icon name={r.icon} size={26} /></span>
              <span className={s.title}>{r.title}</span>
              <span className={s.desc}>{r.desc}</span>
              <span className={s.go}>Continue <Icon name="arrow" size={16} /></span>
            </button>
          ))}
        </motion.div>

        <motion.div variants={riseItem} className={s.login}>
          Already have an account? <button type="button" onClick={onLogin}>Log in</button>
        </motion.div>
      </motion.div>
    </div>
  );
}
