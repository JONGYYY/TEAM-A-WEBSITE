"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "./Icon";
import s from "./AccountMenu.module.css";

export function AccountMenu() {
  const { user, logout, hydrated, listAccounts, switchTo } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!hydrated) return null;

  if (!user) {
    return (
      <Link href="/dashboard?auth=signup" className="btn btn-ivy" style={{ padding: "0.5rem 0.95rem", fontSize: "0.85rem" }}>
        Save progress
      </Link>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();
  const others = listAccounts().filter((a) => a.email !== user.email);

  function handleSwitch(email: string, role: string) {
    if (switchTo(email)) {
      setOpen(false);
      router.push(role === "counselor" ? "/quizzes" : "/dashboard");
    }
  }

  return (
    <div className={s.wrap} ref={ref}>
      <button className={s.trigger} onClick={() => setOpen((o) => !o)} aria-label="Account menu">
        <span className={s.avatar}>{initial}</span>
        <span className={s.name}>{user.name}</span>
        <span className={s.roleBadge} data-role={user.role}>{user.role}</span>
        <Icon name="arrow" size={14} className={s.chev} />
      </button>
      {open && (
        <div className={`${s.menu} surface`}>
          <div className={s.menuHead}>
            <span className={s.avatar}>{initial}</span>
            <div>
              <div className={s.menuName}>{user.name}</div>
              <div className={s.menuEmail}>{user.email}</div>
            </div>
            <span className={s.roleBadge} data-role={user.role}>{user.role}</span>
          </div>

          {others.length > 0 && (
            <div className={s.section}>
              <div className={s.sectionLabel}>Switch account</div>
              {others.map((a) => (
                <button key={a.email} className={s.menuItem} onClick={() => handleSwitch(a.email, a.role)}>
                  <span className={s.miniAvatar}>{a.name.charAt(0).toUpperCase()}</span>
                  <span className={s.switchInfo}>
                    <span className={s.switchName}>{a.name}</span>
                    <span className={s.switchEmail}>{a.email}</span>
                  </span>
                  <span className={s.roleBadge} data-role={a.role}>{a.role}</span>
                </button>
              ))}
            </div>
          )}

          <div className={s.section}>
            <Link href="/dashboard?auth=signup" className={s.menuItem} onClick={() => setOpen(false)}>
              <Icon name="spark" size={15} /> Add another account
            </Link>
            <button
              className={s.menuItem}
              onClick={() => {
                logout();
                setOpen(false);
                router.push("/dashboard");
              }}
            >
              <Icon name="lock" size={15} /> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
