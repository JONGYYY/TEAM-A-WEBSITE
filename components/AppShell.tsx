"use client";

import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { useStore } from "@/lib/store";
import s from "./Sidebar.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, hydrated } = useStore();
  const name = hydrated && profile.basic.firstName ? profile.basic.firstName : null;

  return (
    <div className={s.shell}>
      <Sidebar />
      <div className={s.main}>
        <div className={s.topbar}>
          <span className={`${s.topbarSpacer} eyebrow`}>
            {name ? `Signed in · ${name}` : "Welcome"}
          </span>
          <ThemeToggle />
        </div>
        <div className={s.content}>{children}</div>
      </div>
    </div>
  );
}
