"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
<<<<<<< HEAD
import { CommandPalette } from "./CommandPalette";
import { Icon } from "./Icon";
import { useStore } from "@/lib/store";
import s from "./Sidebar.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, hydrated } = useStore();
  const name = hydrated && profile.basic.firstName ? profile.basic.firstName : null;
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  }
=======
import { AccountMenu } from "./AccountMenu";
import { useAuth } from "@/lib/auth";
import s from "./Sidebar.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();
>>>>>>> f58d42b9bc395998a4cded441b413ee69c071a73

  return (
    <div className={s.shell}>
      <div className="no-print"><Sidebar /></div>
      <div className={s.main}>
        <div className={`${s.topbar} no-print`}>
          <span className={`${s.topbarSpacer} eyebrow`}>
            {hydrated && user ? `Signed in · ${user.name}` : "Guest mode"}
          </span>
<<<<<<< HEAD
          <button className={s.cmdBtn} onClick={openPalette} aria-label="Open command palette">
            <Icon name="search" size={14} />
            <span>Search</span>
            <kbd className={s.cmdKbd}>{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>
=======
          <AccountMenu />
>>>>>>> f58d42b9bc395998a4cded441b413ee69c071a73
          <ThemeToggle />
        </div>
        <div className={`${s.content} print-content`}>{children}</div>
      </div>
      <CommandPalette />
    </div>
  );
}
