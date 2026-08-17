"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getEssaysByOwner, deleteEssay, onEssayChange } from "@/lib/essays";
import { hasExtracurriculars } from "@/lib/essayContent";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import type { Essay, EssayStatus } from "@/lib/types";
import s from "./essays.module.css";

const STATUS_FILTERS: { id: "all" | EssayStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "in_progress", label: "In progress" },
  { id: "final", label: "Final" },
];

function collegeLabel(e: Essay): string {
  if (e.promptSnapshot.college) return e.promptSnapshot.college;
  if (e.promptSnapshot.source === "common_app") return "Common App";
  return "Custom prompt";
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  if (!d) return "";
  const mins = Math.round((Date.now() - d) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function EssayLibrary() {
  const { user, email, hydrated } = useAuth();
  const { profile, hydrated: storeHydrated } = useStore();
  const needsEC = user && storeHydrated && !hasExtracurriculars(profile);
  const [essays, setEssays] = useState<Essay[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | EssayStatus>("all");

  const load = useCallback(async () => {
    if (!user) {
      setEssays([]);
      return;
    }
    setEssays(await getEssaysByOwner(email));
  }, [user, email]);

  useEffect(() => {
    if (!hydrated) return;
    load();
    return onEssayChange(load);
  }, [hydrated, load]);

  const filtered = useMemo(() => {
    if (!essays) return [];
    const q = query.trim().toLowerCase();
    return essays.filter((e) => {
      if (status !== "all" && e.status !== status) return false;
      if (!q) return true;
      return (
        collegeLabel(e).toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.promptSnapshot.promptText.toLowerCase().includes(q) ||
        (e.promptSnapshot.major || "").toLowerCase().includes(q)
      );
    });
  }, [essays, query, status]);

  async function remove(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this essay? This can't be undone.")) return;
    await deleteEssay(id);
    load();
  }

  if (!hydrated || essays === null) {
    return <div className="container" style={{ minHeight: "40vh" }} />;
  }

  return (
    <div className="container">
      <PageHeader
        eyebrow="Essays · Essay Studio"
        title="Your Essay Studio"
        lead="Pick a prompt, brainstorm from your own story, and draft with an AI coach beside you — every version saved."
      />

      {!user ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}><Icon name="lock" size={24} /></span>
          <h3>Sign in to use the Essay Studio</h3>
          <p>Your essays, comments, and AI chats sync to your account so you can pick up on any device.</p>
          <Link href="/dashboard?auth=login" className="btn btn-primary">Sign in</Link>
        </div>
      ) : (
        <>
          {needsEC && (
            <div className={s.gateBanner}>
              <Icon name="award" size={18} />
              <span className="grow">Add your extracurriculars before starting an essay — your coach brainstorms and gives feedback from your real activities.</span>
              <Link href="/college/profile" className="btn btn-ghost" style={{ padding: "0.45rem 0.8rem" }}>Add now</Link>
            </div>
          )}
          <div className={s.toolbar}>
            <Link href="/essays/new" className="btn btn-primary"><Icon name="spark" size={16} /> New essay</Link>
            <div className={s.search}>
              <span className={s.searchIcon}><Icon name="search" size={16} /></span>
              <input
                className="input"
                placeholder="Search by college, prompt, or title"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search essays"
              />
            </div>
            <div className={s.filters} role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button key={f.id} className="chip" data-selected={status === f.id} onClick={() => setStatus(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className={s.empty}>
              <span className={s.emptyIcon}><Icon name="book" size={24} /></span>
              <h3>{essays.length === 0 ? "No essays yet" : "No essays match your filters"}</h3>
              <p>
                {essays.length === 0
                  ? "Start with a Common App prompt, a college + major prompt, or paste your own."
                  : "Try a different search or status filter."}
              </p>
              {essays.length === 0 && <Link href="/essays/new" className="btn btn-primary"><Icon name="spark" size={16} /> Start your first essay</Link>}
            </div>
          ) : (
            <motion.div className={s.grid} variants={staggerParent} initial="hidden" animate="show">
              {filtered.map((e) => (
                <motion.div key={e.id} variants={riseItem}>
                  <Link href={`/essays/${e.id}`} className={s.card}>
                    <div className={s.cardTop}>
                      <span className={s.collegeBadge}>
                        <span className={s.dot} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{collegeLabel(e)}</span>
                      </span>
                      <button className={s.deleteBtn} onClick={(ev) => remove(ev, e.id)} aria-label="Delete essay">
                        <Icon name="x" size={16} />
                      </button>
                    </div>
                    {e.promptSnapshot.major && <span className="tag-mono">{e.promptSnapshot.major}</span>}
                    <p className={s.cardPrompt}>{e.promptSnapshot.promptText || e.title || "Untitled essay"}</p>
                    <div className={s.cardMeta}>
                      <span className={s.statusPill} data-status={e.status}>
                        {e.status === "in_progress" ? "In progress" : e.status}
                      </span>
                      <span className={s.metaItem}>
                        {e.wordCount}{e.promptSnapshot.wordLimit ? ` / ${e.promptSnapshot.wordLimit}` : ""} words
                      </span>
                      {e.score && (
                        <span className={s.scoreChip}>{e.score.overall}<small>/100</small></span>
                      )}
                      <span className={s.metaItem} style={{ marginLeft: "auto" }}>{timeAgo(e.updatedAt)}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
