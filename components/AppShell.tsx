"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
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

  return (
    <div className={s.shell}>
      <div className="no-print"><Sidebar /></div>
      <div className={s.main}>
        <div className={`${s.topbar} no-print`}>
          <span className={`${s.topbarSpacer} eyebrow`}>
            {name ? `Signed in · ${name}` : "Welcome"}
          </span>
          <button className={s.cmdBtn} onClick={openPalette} aria-label="Open command palette">
            <Icon name="search" size={14} />
            <span>Search</span>
            <kbd className={s.cmdKbd}>{mac ? "⌘" : "Ctrl"} K</kbd>
          </button>
          <ThemeToggle />
        </div>
        <div className={`${s.content} print-content`}>{children}</div>
      </div>
      <CommandPalette />
    </div>
  );
}
