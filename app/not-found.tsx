"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";

export default function NotFound() {
  return (
    <div className="container" style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}>
      <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ maxWidth: 520 }}>
        <motion.span variants={riseItem} className="eyebrow">
          404 · off the map
        </motion.span>
        <motion.h1 variants={riseItem} style={{ marginTop: "0.6rem" }}>
          This page took a <em style={{ fontStyle: "italic", color: "var(--ivy-bright)" }}>gap year</em>.
        </motion.h1>
        <motion.p variants={riseItem} style={{ marginTop: "0.9rem", fontSize: "1.05rem" }}>
          We couldn&apos;t find what you&apos;re looking for. It may have moved, or the link might be off — either way, let&apos;s get you back on track.
        </motion.p>
        <motion.div variants={riseItem} style={{ marginTop: "1.6rem", display: "flex", gap: "0.75rem" }}>
          <Link href="/dashboard" className="btn btn-primary">
            <Icon name="compass" size={16} /> Back to Dashboard
          </Link>
          <Link href="/college/colleges" className="btn btn-ghost">
            Explore Colleges
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
