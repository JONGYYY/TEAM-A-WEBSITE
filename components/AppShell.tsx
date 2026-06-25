"use client";

import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { AccountMenu } from "./AccountMenu";
import { useAuth } from "@/lib/auth";
import s from "./Sidebar.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, hydrated } = useAuth();

  return (
    <div className={s.shell}>
      <Sidebar />
      <div className={s.main}>
        <div className={s.topbar}>
          <span className={`${s.topbarSpacer} eyebrow`}>
            {hydrated && user ? `Signed in · ${user.name}` : "Guest mode"}
          </span>
          <AccountMenu />
          <ThemeToggle />
        </div>
        <div className={s.content}>{children}</div>
      </div>
    </div>
  );
}
