"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container" style={{ minHeight: "70vh", display: "flex", alignItems: "center" }}>
      <motion.div variants={staggerParent} initial="hidden" animate="show" style={{ maxWidth: 520 }}>
        <motion.span variants={riseItem} className="eyebrow" style={{ color: "var(--clay)" }}>
          Something went sideways
        </motion.span>
        <motion.h1 variants={riseItem} style={{ marginTop: "0.6rem" }}>
          We hit a snag.
        </motion.h1>
        <motion.p variants={riseItem} style={{ marginTop: "0.9rem", fontSize: "1.05rem" }}>
          Nothing you did caused this — the page ran into an unexpected error. Your saved data is safe.
        </motion.p>
        <motion.div variants={riseItem} style={{ marginTop: "1.6rem", display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-primary" onClick={reset}>
            <Icon name="rocket" size={16} /> Try again
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Back to Dashboard
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
