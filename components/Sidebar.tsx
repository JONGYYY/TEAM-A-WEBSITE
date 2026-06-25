"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import { completionPct } from "@/lib/taxonomy";
import s from "./Sidebar.module.css";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", icon: "gauge", name: "Dashboard" }],
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

export function Sidebar() {
  const pathname = usePathname();
  const { profile, hydrated } = useStore();
  const pct = hydrated ? completionPct(profile) : 0;
  const gatedUnlocked = pct >= 60;

  return (
    <aside className={s.sidebar}>
      <Link href="/dashboard" className={s.brand}>
        <span className={s.brandMark}>
          <Icon name="grad" size={20} />
        </span>
        <span>
          <span className={s.brandName}>DreamCollege</span>
          <br />
          <span className={s.brandSub}>College & Career</span>
        </span>
      </Link>

      {NAV.map((section) => (
        <div key={section.label} className={s.navSection}>
          <div className={s.navLabel}>{section.label}</div>
          {section.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const locked = "gated" in item && item.gated && !gatedUnlocked;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${s.navItem} ${active ? s.active : ""} ${locked ? s.locked : ""}`}
              >
                <Icon name={item.icon} size={18} />
                {item.name}
                {locked && <Icon name="lock" size={14} className={s.lock} />}
              </Link>
            );
          })}
        </div>
      ))}

      <div className={s.progressBox}>
        <div className={s.progressTop}>
          <span className="eyebrow">Profile</span>
          <span className={s.progressNum}>{pct}%</span>
        </div>
        <div className={s.progressTrack}>
          <div className={s.progressFill} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </aside>
  );
}
