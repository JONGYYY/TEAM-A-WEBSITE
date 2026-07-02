"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import s from "./Polish.module.css";

/** Thin reading-progress bar that fills as you scroll a long page. */
export function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    function update() {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setPct(max > 40 ? Math.min(1, doc.scrollTop / max) : 0);
    }
    function onScroll() { if (!raf) raf = requestAnimationFrame(update); }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className={`${s.progress} no-print`}
      style={{ width: "100%", transform: `scaleX(${pct})`, opacity: pct > 0.01 ? 1 : 0 }}
      aria-hidden
    />
  );
}

/** Floating "back to top" button, shown once you've scrolled down. */
export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onScroll() { setShow(window.scrollY > 640); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function toTop() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          className={`${s.top} no-print`}
          onClick={toTop}
          aria-label="Back to top"
          title="Back to top"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <Icon name="upload" size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

const SHORTCUTS: { label: string; keys: string[] }[] = [
  { label: "Open command palette", keys: ["⌘/Ctrl", "K"] },
  { label: "Show this help", keys: ["?"] },
  { label: "Answer a quiz question", keys: ["1", "–", "5"] },
  { label: "Close any dialog", keys: ["Esc"] },
];

/** Press "?" anywhere (outside inputs) to see keyboard shortcuts. */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key !== "?") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setOpen((o) => !o);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={s.scrim}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={() => setOpen(false)}
        >
          <motion.div
            className={s.panel}
            role="dialog" aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={s.head}>
              <h3>Keyboard shortcuts</h3>
              <button className={s.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className={s.rows}>
              {SHORTCUTS.map((sc) => (
                <div key={sc.label} className={s.row}>
                  <span className={s.rowLabel}>{sc.label}</span>
                  <span className={s.keys}>
                    {sc.keys.map((k, i) => <kbd key={i} className={s.key}>{k}</kbd>)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
