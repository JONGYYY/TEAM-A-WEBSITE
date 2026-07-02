"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { GUEST, migrateBucket } from "./storageKeys";

const USERS_KEY = "dc.users";
const SESSION_KEY = "dc.session";

export type Role = "student" | "counselor";

interface StoredUser { name: string; email: string; pass: string; createdAt: string; role?: Role }
export interface PublicUser { name: string; email: string; role: Role }

interface AuthShape {
  user: PublicUser | null;
  email: string; // current bucket owner: the user's email or "guest"
  role: Role; // active account role (defaults to "student" for guests/legacy)
  hydrated: boolean;
  signup: (name: string, email: string, password: string, role?: Role) => { ok: boolean; error?: string };
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  listAccounts: () => PublicUser[];
  switchTo: (email: string) => boolean;
}

const AuthContext = createContext<AuthShape | null>(null);

function readUsers(): Record<string, StoredUser> {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; }
}
function writeUsers(u: Record<string, StoredUser>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}
// Not real security — local demo only.
const hash = (s: string) => (typeof btoa !== "undefined" ? btoa(`dc:${s}`) : s);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const users = readUsers();
        const u = users[session.toLowerCase()];
        if (u) setUser({ name: u.name, email: u.email, role: u.role ?? "student" });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const signup = useCallback((name: string, emailRaw: string, password: string, role: Role = "student") => {
    const email = emailRaw.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: "Please enter your name." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    const users = readUsers();
    if (users[email]) return { ok: false, error: "An account with this email already exists. Try logging in." };

    users[email] = { name: name.trim(), email, pass: hash(password), createdAt: new Date().toISOString(), role };
    writeUsers(users);
    migrateBucket(GUEST, email, true); // carry their intake answers into the new account
    localStorage.setItem(SESSION_KEY, email);
    setUser({ name: name.trim(), email, role });
    return { ok: true };
  }, []);

  const login = useCallback((emailRaw: string, password: string) => {
    const email = emailRaw.trim().toLowerCase();
    const users = readUsers();
    const u = users[email];
    if (!u || u.pass !== hash(password)) return { ok: false, error: "Email or password is incorrect." };
    localStorage.setItem(SESSION_KEY, email);
    setUser({ name: u.name, email: u.email, role: u.role ?? "student" });
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  // Local-demo convenience: list every account registered in this browser.
  const listAccounts = useCallback((): PublicUser[] => {
    const users = readUsers();
    return Object.values(users).map((u) => ({ name: u.name, email: u.email, role: u.role ?? "student" }));
  }, []);

  // Switch to another local account without a password (demo only).
  const switchTo = useCallback((emailRaw: string) => {
    const target = emailRaw.trim().toLowerCase();
    const u = readUsers()[target];
    if (!u) return false;
    localStorage.setItem(SESSION_KEY, target);
    setUser({ name: u.name, email: u.email, role: u.role ?? "student" });
    return true;
  }, []);

  const email = user?.email ?? GUEST;
  const role = user?.role ?? "student";

  return (
    <AuthContext.Provider value={{ user, email, role, hydrated, signup, login, logout, listAccounts, switchTo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
