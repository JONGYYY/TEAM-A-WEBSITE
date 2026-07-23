"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { ScrollProgress, BackToTop, ShortcutsHelp } from "./Polish";
import { Icon } from "./Icon";
import { AccountMenu } from "./AccountMenu";
import { useAuth } from "@/lib/auth";
import s from "./Sidebar.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
  const [mac, setMac] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    document.body.style.overflow = navOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  }

  return (
    <div className={s.shell}>
      <ScrollProgress />
      <div className="no-print"><Sidebar open={navOpen} onClose={() => setNavOpen(false)} /></div>
      <div className={s.main}>
        <div className={`${s.topbar} no-print`}>
          <button className={s.menuBtn} onClick={() => setNavOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={18} />
          </button>
          <span className={`${s.topbarSpacer} eyebrow`}>
            {hydrated && user ? `Signed in · ${user.name}` : "Guest mode"}
          </span>
          <button className={s.cmdBtn} onClick={openPalette} aria-label="Open command palette">
            <Icon name="search" size={14} />
            <span>Search</span>
            <kbd className={s.cmdKbd}>{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>
          <AccountMenu />
          <ThemeToggle />
        </div>
        <div className={`${s.content} print-content`}>{children}</div>
      </div>
      <CommandPalette />
      <BackToTop />
      <ShortcutsHelp />
    </div>
  );
}
