"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import type { StudentProfile, AssessmentReport } from "./types";
import { emptyProfile } from "./taxonomy";
import { useAuth } from "./auth";
import { bucketKey } from "./storageKeys";

interface StoreShape {
  profile: StudentProfile;
  setProfile: (updater: (p: StudentProfile) => StudentProfile) => void;
  assessment: AssessmentReport | null;
  setAssessment: (a: AssessmentReport | null) => void;
  resetAll: () => void;
  hydrated: boolean;
}

const StoreContext = createContext<StoreShape | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { email, hydrated: authHydrated } = useAuth();
  const [profile, setProfileState] = useState<StudentProfile>(emptyProfile);
  const [assessment, setAssessmentState] = useState<AssessmentReport | null>(null);
  const [loadedEmail, setLoadedEmail] = useState<string | null>(null);
  const emailRef = useRef(email);
  emailRef.current = email;

  // Load (or reload) the active account's bucket whenever the session changes.
  useEffect(() => {
    if (!authHydrated) return;
    try {
      const raw = localStorage.getItem(bucketKey(email, "profile"));
      setProfileState(raw ? { ...emptyProfile(), ...JSON.parse(raw) } : emptyProfile());
      const a = localStorage.getItem(bucketKey(email, "assessment"));
      setAssessmentState(a ? JSON.parse(a) : null);
    } catch {
      setProfileState(emptyProfile());
      setAssessmentState(null);
    }
    setLoadedEmail(email);
  }, [email, authHydrated]);

  // Not ready until the bucket for the *current* account has been loaded —
  // prevents a flash of stale data during login/logout transitions.
  const hydrated = authHydrated && loadedEmail === email;

  const setProfile = useCallback((updater: (p: StudentProfile) => StudentProfile) => {
    setProfileState((prev) => {
      const next = updater(prev);
      next.meta = { ...next.meta, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(bucketKey(emailRef.current, "profile"), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setAssessment = useCallback((a: AssessmentReport | null) => {
    setAssessmentState(a);
    try {
      const key = bucketKey(emailRef.current, "assessment");
      if (a) localStorage.setItem(key, JSON.stringify(a));
      else localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, []);

  const resetAll = useCallback(() => {
    setProfileState(emptyProfile());
    setAssessmentState(null);
    try {
      localStorage.removeItem(bucketKey(emailRef.current, "profile"));
      localStorage.removeItem(bucketKey(emailRef.current, "assessment"));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <StoreContext.Provider value={{ profile, setProfile, assessment, setAssessment, resetAll, hydrated }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
