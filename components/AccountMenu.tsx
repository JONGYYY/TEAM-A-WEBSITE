"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Icon } from "./Icon";
import s from "./AccountMenu.module.css";

export function AccountMenu() {
  const { user, logout, hydrated } = useAuth();
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

  return (
    <div className={s.wrap} ref={ref}>
      <button className={s.trigger} onClick={() => setOpen((o) => !o)} aria-label="Account menu">
        <span className={s.avatar}>{initial}</span>
        <span className={s.name}>{user.name}</span>
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
          </div>
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
      )}
    </div>
  );
}
