"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { getEssaysByOwner, deleteEssay, archiveEssay, onEssayChange } from "@/lib/essays";
import { hasExtracurriculars, isDraftStatus, isReviewStatus, statusLabel } from "@/lib/essayContent";
import { PageHeader } from "@/components/PageHeader";
import { Icon } from "@/components/Icon";
import { staggerParent, riseItem } from "@/lib/motion";
import type { Essay, EssayStatus } from "@/lib/types";
import s from "./essays.module.css";

type StatusFilter = "all" | "drafts" | "in_review" | "reviewed" | "archived";
type ViewMode = "type" | "school";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drafts", label: "Drafts" },
  { id: "in_review", label: "In review" },
  { id: "reviewed", label: "Reviewed" },
  { id: "archived", label: "Archived" },
];

function collegeLabel(e: Essay): string {
  if (e.promptSnapshot.college) return e.promptSnapshot.college;
  if (e.promptSnapshot.source === "common_app") return "Common App";
  return "Custom prompt";
}

function matchStatus(status: EssayStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case "all": return status !== "archived";
    case "drafts": return isDraftStatus(status);
    case "in_review": return status === "in_review";
    case "reviewed": return status === "reviewed" || status === "final";
    case "archived": return status === "archived";
    default: return true;
  }
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

function EssayCard({ e, onRemove, onArchive }: { e: Essay; onRemove: (ev: React.MouseEvent, id: string) => void; onArchive: (ev: React.MouseEvent, id: string) => void }) {
  return (
    <motion.div variants={riseItem}>
      <Link href={`/essays/${e.id}`} className={s.card}>
        <div className={s.cardTop}>
          <span className={s.collegeBadge}>
            <span className={s.dot} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{collegeLabel(e)}</span>
          </span>
          <div className={s.cardActions}>
            {e.status !== "archived" && (
              <button className={s.iconAction} onClick={(ev) => onArchive(ev, e.id)} aria-label="Archive essay" title="Archive">
                <Icon name="bookmark" size={15} />
              </button>
            )}
            <button className={s.iconAction} onClick={(ev) => onRemove(ev, e.id)} aria-label="Delete essay" title="Delete">
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        {e.promptSnapshot.major && <span className="tag-mono">{e.promptSnapshot.major}</span>}
        <p className={s.cardPrompt}>{e.promptSnapshot.promptText || e.title || "Untitled essay"}</p>
        <div className={s.cardMeta}>
          <span className={s.statusPill} data-status={e.status}>{statusLabel(e.status)}</span>
          <span className={s.metaItem}>
            {e.wordCount}{e.promptSnapshot.wordLimit ? ` / ${e.promptSnapshot.wordLimit}` : ""} words
          </span>
          {e.score && <span className={s.scoreChip}>{e.score.overall}<small>/100</small></span>}
          <span className={s.metaItem} style={{ marginLeft: "auto" }}>{timeAgo(e.updatedAt)}</span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function EssayStudioHub() {
  const { user, email, hydrated } = useAuth();
  const { profile, hydrated: storeHydrated } = useStore();
  const needsEC = user && storeHydrated && !hasExtracurriculars(profile);
  const [essays, setEssays] = useState<Essay[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("type");

  const load = useCallback(async () => {
    if (!user) { setEssays([]); return; }
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
      if (!matchStatus(e.status, status)) return false;
      if (!q) return true;
      return (
        collegeLabel(e).toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.promptSnapshot.promptText.toLowerCase().includes(q) ||
        (e.promptSnapshot.major || "").toLowerCase().includes(q)
      );
    });
  }, [essays, query, status]);

  const drafts = useMemo(() => filtered.filter((e) => isDraftStatus(e.status)), [filtered]);
  const reviews = useMemo(() => filtered.filter((e) => isReviewStatus(e.status)), [filtered]);
  const archived = useMemo(() => filtered.filter((e) => e.status === "archived"), [filtered]);

  const schoolGroups = useMemo(() => {
    const map = new Map<string, Essay[]>();
    for (const e of filtered) {
      const k = collegeLabel(e);
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === "Common App") return -1;
      if (b[0] === "Common App") return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  async function remove(ev: React.MouseEvent, id: string) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!confirm("Delete this essay? This can't be undone.")) return;
    await deleteEssay(id);
    load();
  }

  async function archive(ev: React.MouseEvent, id: string) {
    ev.preventDefault();
    ev.stopPropagation();
    await archiveEssay(id);
    load();
  }

  if (!hydrated || essays === null) {
    return <div className="container" style={{ minHeight: "40vh" }} />;
  }

  return (
    <div className={`container ${s.hub}`}>
      <PageHeader
        eyebrow="Essays · Essay Studio"
        title="Your Essay Studio"
        lead="Start a new essay from scratch or upload an existing one for AI review. Every version saved, every step supported."
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

          {/* Entry cards */}
          <div className={s.entryCards}>
            <Link href="/essays/new" className={s.entryCard}>
              <span className={s.entryIcon} data-tone="new"><Icon name="pencil" size={22} /></span>
              <span className={s.entryBody}>
                <span className={s.entryTitle}>New Essay</span>
                <span className={s.entryDesc}>Start writing with AI guidance from a prompt, outline, or idea.</span>
              </span>
              <span className={s.entryArrow}><Icon name="arrow" size={18} /></span>
            </Link>
            <Link href="/essays/review" className={s.entryCard}>
              <span className={s.entryIcon} data-tone="review"><Icon name="upload" size={22} /></span>
              <span className={s.entryBody}>
                <span className={s.entryTitle}>Essay Review</span>
                <span className={s.entryDesc}>Upload an existing essay to get AI feedback, suggestions, and a quality score.</span>
              </span>
              <span className={s.entryArrow}><Icon name="arrow" size={18} /></span>
            </Link>
          </div>

          {/* Toolbar */}
          <div className={s.toolbar}>
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
            <div className={s.viewToggle} role="group" aria-label="Group essays">
              <button className={s.viewBtn} data-active={view === "type"} onClick={() => setView("type")}><Icon name="layers" size={14} /> By type</button>
              <button className={s.viewBtn} data-active={view === "school"} onClick={() => setView("school")}><Icon name="building" size={14} /> By school</button>
            </div>
            <div className={s.filters} role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button key={f.id} className="chip" data-selected={status === f.id} onClick={() => setStatus(f.id)}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Content */}
          {filtered.length === 0 ? (
            <div className={s.empty}>
              <span className={s.emptyIcon}><Icon name="book" size={24} /></span>
              <h3>{essays.length === 0 ? "No essays yet" : "No essays match your filters"}</h3>
              <p>
                {essays.length === 0
                  ? "Start a new essay from a prompt, or upload one you've already written for a review."
                  : "Try a different search or status filter."}
              </p>
              {essays.length === 0 && (
                <div className={s.emptyActions}>
                  <Link href="/essays/new" className="btn btn-primary"><Icon name="pencil" size={16} /> New essay</Link>
                  <Link href="/essays/review" className="btn btn-ghost"><Icon name="upload" size={16} /> Upload for review</Link>
                </div>
              )}
            </div>
          ) : view === "school" ? (
            <div className={s.groups}>
              {schoolGroups.map(([school, list]) => (
                <section key={school} className={s.group}>
                  <div className={s.groupHead}>
                    <span className={s.groupName}><span className={s.dot} /> {school}</span>
                    <span className={s.groupCount}>{list.length} {list.length === 1 ? "essay" : "essays"}</span>
                  </div>
                  <motion.div className={s.grid} variants={staggerParent} initial="hidden" animate="show">
                    {list.map((e) => <EssayCard key={e.id} e={e} onRemove={remove} onArchive={archive} />)}
                  </motion.div>
                </section>
              ))}
            </div>
          ) : (
            <div className={s.groups}>
              {drafts.length > 0 && (
                <section className={s.group}>
                  <div className={s.groupHead}>
                    <span className={s.groupName}><Icon name="pencil" size={16} /> Essay Drafts</span>
                    <span className={s.groupCount}>{drafts.length}</span>
                  </div>
                  <motion.div className={s.grid} variants={staggerParent} initial="hidden" animate="show">
                    {drafts.map((e) => <EssayCard key={e.id} e={e} onRemove={remove} onArchive={archive} />)}
                  </motion.div>
                </section>
              )}
              {reviews.length > 0 && (
                <section className={s.group}>
                  <div className={s.groupHead}>
                    <span className={s.groupName}><Icon name="gauge" size={16} /> Essay Reviews</span>
                    <span className={s.groupCount}>{reviews.length}</span>
                  </div>
                  <motion.div className={s.grid} variants={staggerParent} initial="hidden" animate="show">
                    {reviews.map((e) => <EssayCard key={e.id} e={e} onRemove={remove} onArchive={archive} />)}
                  </motion.div>
                </section>
              )}
              {archived.length > 0 && (
                <section className={s.group}>
                  <div className={s.groupHead}>
                    <span className={s.groupName}><Icon name="bookmark" size={16} /> Archived</span>
                    <span className={s.groupCount}>{archived.length}</span>
                  </div>
                  <motion.div className={s.grid} variants={staggerParent} initial="hidden" animate="show">
                    {archived.map((e) => <EssayCard key={e.id} e={e} onRemove={remove} onArchive={archive} />)}
                  </motion.div>
                </section>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
