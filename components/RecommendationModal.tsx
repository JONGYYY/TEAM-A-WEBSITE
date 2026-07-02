"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import type { Recommendations, CollegeRec } from "@/lib/types";
import s from "./RecommendationModal.module.css";

const BANDS: { key: keyof Recommendations["colleges"]; label: string; note: string; color: string }[] = [
  { key: "reach", label: "Reach", note: "Ambitious", color: "#e05a5a" },
  { key: "target", label: "Target", note: "Well-matched", color: "#12a7bd" },
  { key: "likely", label: "Likely", note: "Within reach", color: "#2fa56e" },
];

export function RecommendationModal({
  rec,
  open,
  onClose,
}: {
  rec: Recommendations | undefined;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && rec && (
        <motion.div
          className={s.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Your best-fit matches"
        >
          <motion.div
            className={`${s.modal} surface`}
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={s.close} onClick={onClose} aria-label="Close">
              <Icon name="x" size={18} />
            </button>

            <div className={s.head}>
              <span className={s.confetti} aria-hidden>✦</span>
              <span className="eyebrow">Profile submitted</span>
              <h2 className={s.title}>Your matches are ready</h2>
              <p className={s.sub}>{rec.summary}</p>
            </div>

            <div className={s.scroll}>
              <section className={s.block}>
                <span className={s.blockLabel}>Best-fit majors</span>
                <div className={s.majorGrid}>
                  {rec.majors.map((m, i) => (
                    <motion.div
                      key={m.name}
                      className={s.majorCard}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.45 }}
                    >
                      <div className={s.majorTop}>
                        <span className={s.majorName}>{m.name}</span>
                        <span className={s.fitPill}>{m.fit}% fit</span>
                      </div>
                      <p className={s.why}>{m.why}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section className={s.block}>
                <span className={s.blockLabel}>Six schools to explore</span>
                <div className={s.bandGrid}>
                  {BANDS.map((band, bi) => (
                    <div key={band.key} className={s.bandCol}>
                      <div className={s.bandHead} style={{ color: band.color }}>
                        <span className={s.bandDot} style={{ background: band.color }} />
                        <span className={s.bandLabel}>{band.label}</span>
                        <span className={s.bandNote}>{band.note}</span>
                      </div>
                      {rec.colleges[band.key].map((c, ci) => (
                        <CollegeCard key={c.name} c={c} color={band.color} delay={0.25 + bi * 0.06 + ci * 0.05} />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className={s.actions}>
              <button className="btn btn-ghost" onClick={onClose}>View full evaluation</button>
              <Link href="/college/colleges" className="btn btn-primary">
                Explore colleges <Icon name="arrow" size={16} />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CollegeCard({ c, color, delay }: { c: CollegeRec; color: string; delay: number }) {
  return (
    <motion.div
      className={s.collegeCard}
      style={{ borderLeftColor: color }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className={s.collegeTop}>
        <span className={s.collegeName}>{c.name}</span>
        <span className={s.fitMini} style={{ color }}>{c.fit}%</span>
      </div>
      {c.location && <span className={s.collegeLoc}>{c.location}</span>}
      <p className={s.collegeWhy}>{c.why}</p>
    </motion.div>
  );
}
