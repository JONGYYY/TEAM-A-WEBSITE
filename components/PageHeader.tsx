"use client";

import { motion } from "framer-motion";

export function PageHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ marginBottom: "1.8rem", maxWidth: "62ch" }}
    >
      <span className="eyebrow">{eyebrow}</span>
      <h1 style={{ margin: "0.4rem 0 0.5rem" }}>{title}</h1>
      {lead && <p style={{ fontSize: "1.05rem" }}>{lead}</p>}
    </motion.header>
  );
}
