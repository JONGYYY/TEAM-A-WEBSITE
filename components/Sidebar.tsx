"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { completionPct } from "@/lib/taxonomy";
import s from "./Sidebar.module.css";

interface NavItem { href: string; icon: string; name: string; gated?: boolean; exact?: boolean }
interface NavSection { label: string; items: NavItem[] }

const STUDENT_NAV: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", icon: "gauge", name: "Dashboard" }],
  },
  {
    label: "Quizzes",
    items: [{ href: "/quizzes", icon: "book", name: "My Quizzes", exact: true }],
  },
  {
    label: "Essays",
    items: [{ href: "/essays", icon: "quote", name: "Essay Studio" }],
  },
  {
    label: "Career Planning",
    items: [
      { href: "/career/discovery", icon: "compass", name: "Career Discovery" },
      { href: "/career/fit-report", icon: "spark", name: "Career Fit Map" },
      { href: "/career/tracks", icon: "layers", name: "My Career Tracks" },
      { href: "/career/explore", icon: "globe", name: "Explore Careers" },
      { href: "/career/planner", icon: "calendar", name: "4-Year Planner" },
    ],
  },
  {
    label: "College Planning",
    items: [
      { href: "/college/profile", icon: "user", name: "College Profile" },
      { href: "/college/positioning", icon: "quote", name: "Positioning Statement" },
      { href: "/college/majors", icon: "book", name: "Majors" },
      { href: "/college/colleges", icon: "building", name: "Colleges" },
      { href: "/college/scholarships", icon: "coins", name: "Scholarships" },
      { href: "/college/shortlist", icon: "bookmark", name: "Shortlist" },
      { href: "/college/assessment", icon: "award", name: "Admissions Eval", gated: true },
    ],
  },
];

const COUNSELOR_NAV: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", icon: "gauge", name: "Dashboard" }],
  },
  {
    label: "Counselor",
    items: [
      { href: "/quizzes", icon: "layers", name: "Quizzes Home", exact: true },
      { href: "/quizzes/build", icon: "spark", name: "Quiz Builder" },
      { href: "/quizzes/assignments", icon: "calendar", name: "Assignments" },
      { href: "/quizzes/results", icon: "pie", name: "Results" },
      { href: "/quizzes/submissions", icon: "award", name: "Submissions" },
    ],
  },
];

export function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapsed }: { open?: boolean; onClose?: () => void; collapsed?: boolean; onToggleCollapsed?: () => void }) {
  const pathname = usePathname();
  const { profile, hydrated } = useStore();
  const { role, hydrated: authHydrated } = useAuth();
  const pct = hydrated ? completionPct(profile) : 0;
  const gatedUnlocked = pct >= 60;
  const isCounselor = authHydrated && role === "counselor";
  const NAV = isCounselor ? COUNSELOR_NAV : STUDENT_NAV;

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`${s.overlay} ${open ? s.overlayOpen : ""}`} onClick={onClose} aria-hidden="true" />
      <aside className={s.sidebar} data-open={open}>
      <div className={s.brand}>
        <Link href="/dashboard" className={s.brandLink}>
          <span className={s.brandMark}>
            <Icon name="grad" size={20} />
          </span>
          <span className={s.brandText}>
            <span className={s.brandName}>DreamCollege</span>
            <br />
            <span className={s.brandSub}>College & Career</span>
          </span>
        </Link>
        {onToggleCollapsed && (
          <button
            type="button"
            className={s.collapseBtn}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span style={{ display: "inline-flex", transform: collapsed ? "none" : "rotate(180deg)" }}><Icon name="arrow" size={16} /></span>
          </button>
        )}
        <button type="button" className={s.closeBtn} onClick={(e) => { e.preventDefault(); onClose?.(); }} aria-label="Close menu">
          <Icon name="x" size={18} />
        </button>
      </div>

      {NAV.map((section) => (
        <div key={section.label} className={s.navSection}>
          <div className={s.navLabel}>{section.label}</div>
          {section.items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const locked = "gated" in item && item.gated && !gatedUnlocked;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.name}
                className={`${s.navItem} ${active ? s.active : ""} ${locked ? s.locked : ""}`}
              >
                <Icon name={item.icon} size={18} />
                <span className={s.navText}>{item.name}</span>
                {locked && <Icon name="lock" size={14} className={s.lock} />}
              </Link>
            );
          })}
        </div>
      ))}

      {!isCounselor && (
        <div className={s.progressBox}>
          <div className={s.progressTop}>
            <span className="eyebrow">Profile</span>
            <span className={s.progressNum}>{pct}%</span>
          </div>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      </aside>
    </>
  );
}
