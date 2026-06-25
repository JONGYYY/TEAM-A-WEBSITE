"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { bucketKey } from "./storageKeys";

/** Session-aware localStorage state hook. `suffix` is namespaced to the active account. */
export function useUserLocal<T>(suffix: string, initial: T): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const { email, hydrated: authHydrated } = useAuth();
  return useLocal(bucketKey(email, suffix), initial, authHydrated);
}

/** Small typed localStorage-backed state hook. */
export function useLocal<T>(key: string, initial: T, ready = true): [T, (v: T | ((p: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setHydrated(false);
    try {
      const raw = localStorage.getItem(key);
      setValue(raw != null ? JSON.parse(raw) : initial);
    } catch {
      /* ignore */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key]
  );

  return [value, set, hydrated];
}
