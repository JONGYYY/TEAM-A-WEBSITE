"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { StudentProfile, AssessmentReport } from "./types";
import { emptyProfile } from "./taxonomy";

const PROFILE_KEY = "dc.profile";
const ASSESSMENT_KEY = "dc.assessment";

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
  const [profile, setProfileState] = useState<StudentProfile>(emptyProfile);
  const [assessment, setAssessmentState] = useState<AssessmentReport | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) setProfileState({ ...emptyProfile(), ...JSON.parse(raw) });
      const a = localStorage.getItem(ASSESSMENT_KEY);
      if (a) setAssessmentState(JSON.parse(a));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setProfile = useCallback((updater: (p: StudentProfile) => StudentProfile) => {
    setProfileState((prev) => {
      const next = updater(prev);
      next.meta = { ...next.meta, updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const setAssessment = useCallback((a: AssessmentReport | null) => {
    setAssessmentState(a);
    try {
      if (a) localStorage.setItem(ASSESSMENT_KEY, JSON.stringify(a));
      else localStorage.removeItem(ASSESSMENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const resetAll = useCallback(() => {
    setProfileState(emptyProfile());
    setAssessmentState(null);
    try {
      localStorage.removeItem(PROFILE_KEY);
      localStorage.removeItem(ASSESSMENT_KEY);
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
