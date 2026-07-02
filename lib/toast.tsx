"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/Icon";
import s from "@/components/Toast.module.css";

type ToastKind = "success" | "info" | "warn";
interface Toast { id: number; message: string; kind: ToastKind }

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
let counter = 0;

const ICON: Record<ToastKind, string> = { success: "check", info: "spark", warn: "warning" };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={s.region} role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={s.toast}
              data-kind={t.kind}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={s.icon}><Icon name={ICON[t.kind]} size={16} /></span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  // Degrade gracefully if used outside the provider (e.g. tests).
  if (!ctx) return { toast: () => {} };
  return ctx;
}
