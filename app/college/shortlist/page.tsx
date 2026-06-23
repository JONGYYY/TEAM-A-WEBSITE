"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLocal } from "@/lib/useLocal";
import { COLLEGES, SCHOLARSHIPS } from "@/lib/content";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import p from "@/components/planning.module.css";

interface Shortlist { colleges: string[]; scholarships: string[] }

export default function ShortlistPage() {
  const [list, setList, hydrated] = useLocal<Shortlist>("dc.shortlist", { colleges: [], scholarships: [] });
  if (!hydrated) return <div className="container" style={{ minHeight: "40vh" }} />;

  const colleges = COLLEGES.filter((c) => list.colleges.includes(c.name));
  const scholarships = SCHOLARSHIPS.filter((s) => list.scholarships.includes(s.name));
  const empty = colleges.length === 0 && scholarships.length === 0;

  const removeCollege = (n: string) => setList((s) => ({ ...s, colleges: s.colleges.filter((x) => x !== n) }));
  const removeSch = (n: string) => setList((s) => ({ ...s, scholarships: s.scholarships.filter((x) => x !== n) }));

  if (empty) {
    return (
      <div className="container">
        <PageHeader eyebrow="College Planning · Shortlist" title="My Shortlist" />
        <div className={p.emptyState}>
          <h3>Your shortlist is empty</h3>
          <p style={{ marginBottom: "1.2rem" }}>Save colleges and scholarships to gather them here.</p>
          <div style={{ display: "flex", gap: "0.7rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/college/colleges" className="btn btn-primary">Browse colleges</Link>
            <Link href="/college/scholarships" className="btn btn-ghost">Browse scholarships</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader eyebrow="College Planning · Shortlist" title="My Shortlist" lead="Everything you've saved, in one place. Export or share with your counselor." />

      {colleges.length > 0 && (
        <section style={{ marginBottom: "2.4rem" }}>
          <span className="eyebrow">Colleges · {colleges.length}</span>
          <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.8rem" }}>
            {colleges.map((c) => (
              <motion.div key={c.name} variants={riseItem} className={p.listRow}>
                <div><div className={p.rowName}>{c.name}</div><div className={p.rowSub}>{c.loc} · Avg SAT {c.avgSat}</div></div>
                <button className={p.saveBtn} data-saved onClick={() => removeCollege(c.name)} aria-label="Remove"><Icon name="check" size={16} /></button>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {scholarships.length > 0 && (
        <section>
          <span className="eyebrow">Scholarships · {scholarships.length}</span>
          <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.8rem" }}>
            {scholarships.map((sc) => (
              <motion.div key={sc.name} variants={riseItem} className={p.listRow}>
                <div><div className={p.rowName}>{sc.name}</div><div className={p.rowSub}>{sc.amount} · {sc.deadline}</div></div>
                <button className={p.saveBtn} data-saved onClick={() => removeSch(sc.name)} aria-label="Remove"><Icon name="check" size={16} /></button>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      <div style={{ marginTop: "2rem", display: "flex", gap: "0.7rem" }}>
        <button className="btn btn-ghost" onClick={() => window.print()}><Icon name="arrow" size={16} /> Export PDF</button>
      </div>
    </div>
  );
}
