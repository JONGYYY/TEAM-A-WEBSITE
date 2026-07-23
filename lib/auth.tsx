"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, hasSupabase } from "./supabase";
import { GUEST, migrateBucket } from "./storageKeys";
import type { Role } from "./types";

export type { Role };

export interface PublicUser { name: string; email: string; role: Role }

interface AuthResult { ok: boolean; error?: string }

interface AuthShape {
  user: PublicUser | null;
  email: string; // current bucket owner: the user's email or "guest"
  role: Role; // active account role (defaults to "student" for guests)
  hydrated: boolean;
  signup: (name: string, email: string, password: string, role?: Role) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthShape | null>(null);

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Loads the profile row (name + role) for a signed-in auth user. */
async function loadProfile(userId: string, email: string): Promise<PublicUser> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("name, email, role")
      .eq("id", userId)
      .maybeSingle();
    if (data) return { name: data.name, email: data.email, role: (data.role as Role) ?? "student" };
  } catch {
    /* ignore — fall back below */
  }
  return { name: email.split("@")[0], email, role: "student" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const session = data.session;
        if (session?.user && active) {
          const p = await loadProfile(session.user.id, session.user.email || "");
          if (active) setUser(p);
        }
      })
      .catch(() => {
        /* offline or Supabase unreachable — fall back to guest */
      })
      .finally(() => {
        if (active) setHydrated(true);
      });

    // Defer any Supabase calls out of the callback to avoid the auth lock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { id, email } = session.user;
        setTimeout(async () => {
          const p = await loadProfile(id, email || "");
          if (active) setUser(p);
        }, 0);
      } else if (active) {
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signup = useCallback(
    async (name: string, emailRaw: string, password: string, role: Role = "student"): Promise<AuthResult> => {
      const email = emailRaw.trim().toLowerCase();
      if (!name.trim()) return { ok: false, error: "Please enter your name." };
      if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
      if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
      if (!hasSupabase()) {
        return { ok: false, error: "Accounts aren't set up on this deployment yet. Continue as a guest for now — your answers still save on this device." };
      }

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        const msg = /already/i.test(error.message)
          ? "An account with this email already exists. Try logging in."
          : error.message;
        return { ok: false, error: msg };
      }
      const uid = data.user?.id;
      if (!uid) return { ok: false, error: "Could not create the account. Please try again." };
      if (!data.session) {
        return { ok: false, error: "Check your email to confirm your account, then log in." };
      }

      // Carry guest intake answers into the new account's bucket BEFORE any
      // awaited call below. The awaited insert yields to Supabase's
      // onAuthStateChange listener, which sets the user and makes the store
      // load this account's bucket; if migration hasn't run yet the bucket is
      // empty and the intake ("map your path") is shown a second time.
      migrateBucket(GUEST, email, true);

      const { error: pErr } = await supabase
        .from("profiles")
        .insert({ id: uid, email, name: name.trim(), role });
      if (pErr && !/duplicate key/i.test(pErr.message)) {
        return { ok: false, error: pErr.message };
      }

      setUser({ name: name.trim(), email, role });
      return { ok: true };
    },
    []
  );

  const login = useCallback(async (emailRaw: string, password: string): Promise<AuthResult> => {
    const email = emailRaw.trim().toLowerCase();
    if (!hasSupabase()) {
      return { ok: false, error: "Accounts aren't set up on this deployment yet. Continue as a guest for now — your answers still save on this device." };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, error: "Email or password is incorrect." };
    const p = await loadProfile(data.user.id, email);
    setUser(p);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const email = user?.email ?? GUEST;
  const role = user?.role ?? "student";

  return (
    <AuthContext.Provider value={{ user, email, role, hydrated, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
