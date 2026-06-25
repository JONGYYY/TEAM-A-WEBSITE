"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { useTheme } from "@/lib/theme";
import { useStore } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { downloadBackup, importBackup } from "@/lib/backup";
import s from "./CommandPalette.module.css";

interface Cmd {
  id: string;
  label: string;
  hint: string;
  icon: string;
  keywords?: string;
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { resetAll } = useStore();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(""); setActive(0); }, []);

  const go = useCallback((href: string) => { router.push(href); close(); }, [router, close]);

  const importFile = useCallback(() => fileRef.current?.click(), []);

  const commands = useMemo<Cmd[]>(() => [
    { id: "dash", label: "Dashboard", hint: "Home", icon: "gauge", run: () => go("/dashboard") },
    { id: "profile", label: "College Profile", hint: "Onboarding", icon: "user", keywords: "build onboarding", run: () => go("/college/profile") },
    { id: "assess", label: "Admissions Evaluation", hint: "Capstone", icon: "award", keywords: "report committee", run: () => go("/college/assessment") },
    { id: "position", label: "Positioning Statement", hint: "Your story", icon: "quote", keywords: "spike narrative", run: () => go("/college/positioning") },
    { id: "majors", label: "Best-fit Majors", hint: "College", icon: "book", run: () => go("/college/majors") },
    { id: "colleges", label: "College List", hint: "Likely · Target · Reach", icon: "building", run: () => go("/college/colleges") },
    { id: "scholar", label: "Scholarships", hint: "College", icon: "coins", run: () => go("/college/scholarships") },
    { id: "shortlist", label: "Shortlist", hint: "Saved", icon: "bookmark", run: () => go("/college/shortlist") },
    { id: "discover", label: "Career Discovery", hint: "Quiz", icon: "compass", run: () => go("/career/discovery") },
    { id: "fit", label: "Career Fit Map", hint: "Career", icon: "spark", run: () => go("/career/fit-report") },
    { id: "tracks", label: "My Career Tracks", hint: "Career", icon: "layers", run: () => go("/career/tracks") },
    { id: "explore", label: "Explore Careers", hint: "14 clusters", icon: "globe", run: () => go("/career/explore") },
    { id: "planner", label: "4-Year Planner", hint: "Roadmap", icon: "calendar", run: () => go("/career/planner") },
    { id: "theme", label: `Switch to ${theme === "light" ? "dark" : "light"} mode`, hint: "Appearance", icon: theme === "light" ? "moon" : "sun", keywords: "theme dark light nightfall", run: () => { toggle(); close(); } },
    { id: "export", label: "Export my profile backup", hint: "Download JSON", icon: "download", keywords: "save backup", run: () => { downloadBackup(); toast("Profile backup downloaded."); close(); } },
    { id: "import", label: "Import a profile backup", hint: "Restore JSON", icon: "upload", keywords: "restore load", run: () => { importFile(); } },
    { id: "reset", label: "Start over", hint: "Clear everything", icon: "warning", keywords: "reset wipe", run: () => { if (confirm("Start over? This clears your profile and assessment on this device.")) { resetAll(); toast("Cleared. Fresh start.", "warn"); } close(); } },
  ], [go, theme, toggle, close, toast, resetAll, importFile]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => (`${c.label} ${c.hint} ${c.keywords ?? ""}`).toLowerCase().includes(q));
  }, [query, commands]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === "Enter") { e.preventDefault(); filtered[active]?.run(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, close]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const n = importBackup(await file.text());
      toast(`Restored ${n} item${n === 1 ? "" : "s"}. Reloading…`, "success");
      close();
      setTimeout(() => window.location.reload(), 700);
    } catch {
      toast("That file isn't a DreamCollege backup.", "warn");
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} />
      <AnimatePresence>
        {open && (
          <motion.div
            className={s.scrim}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={close}
          >
            <motion.div
              className={s.panel}
              role="dialog" aria-label="Command palette"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className={s.searchRow}>
                <Icon name="search" size={18} />
                <input
                  autoFocus
                  className={s.search}
                  placeholder="Jump to a page or run an action…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className={s.kbd}>esc</span>
              </div>
              <div className={s.list}>
                {filtered.length === 0 && <div className={s.empty}>No matches.</div>}
                {filtered.map((c, i) => (
                  <button
                    key={c.id}
                    className={s.item}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={c.run}
                  >
                    <span className={s.itemIcon}><Icon name={c.icon} size={17} /></span>
                    <span className={s.itemLabel}>{c.label}</span>
                    <span className={s.itemHint}>{c.hint}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
