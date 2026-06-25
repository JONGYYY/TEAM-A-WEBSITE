"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CAREER_CLUSTERS } from "@/lib/taxonomy";
import { useUserLocal } from "@/lib/useLocal";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem, easeOut } from "@/lib/motion";
import p from "@/components/planning.module.css";

export default function Explore() {
  const [saved, setSaved] = useUserLocal<string[]>("savedClusters", []);
  const [filter, setFilter] = useState<"all" | "saved">("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = filter === "saved" ? CAREER_CLUSTERS.filter((c) => saved.includes(c.name)) : CAREER_CLUSTERS;
  const toggleSave = (name: string) => setSaved((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

  return (
    <div className="container">
      <PageHeader eyebrow="Career Planning · Explore" title="Explore All Careers" lead="Fourteen career clusters spanning every field. Save the ones that spark interest to revisit later." />

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.4rem" }}>
        <button className="chip" data-selected={filter === "all"} onClick={() => setFilter("all")}>All {CAREER_CLUSTERS.length}</button>
        <button className="chip" data-selected={filter === "saved"} onClick={() => setFilter("saved")}>Saved {saved.length}</button>
      </div>

      {list.length === 0 ? (
        <div className={p.emptyState}><h3>Nothing saved yet</h3><p>Tap the bookmark on a cluster to save it here.</p></div>
      ) : (
        <motion.div variants={staggerParent} initial="hidden" animate="show" className={p.cardGrid}>
          {list.map((c) => (
            <motion.div key={c.name} variants={riseItem} className={`${p.card} ${p.cardHover}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className={p.cardIcon}><Icon name={c.icon} size={22} /></span>
                <button className={p.saveBtn} data-saved={saved.includes(c.name)} onClick={() => toggleSave(c.name)} aria-label="Save">
                  <Icon name="bookmark" size={16} />
                </button>
              </div>
              <div className={p.cardTitle}>{c.name}</div>
              <div className={p.cardBlurb}>{c.blurb}</div>
              <button className="btn btn-ghost" style={{ marginTop: "0.9rem", padding: "0.4rem 0.8rem", fontSize: "0.82rem" }} onClick={() => setOpen(open === c.name ? null : c.name)}>
                {open === c.name ? "Hide" : "Learn more"}
              </button>
              <AnimatePresence>
                {open === c.name && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: easeOut }} style={{ overflow: "hidden" }}>
                    <p style={{ fontSize: "0.85rem", marginTop: "0.8rem" }}>
                      Careers in {c.name} are growing steadily. Typical paths blend hands-on skills with continued learning — explore related majors and build a project to test your interest.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
