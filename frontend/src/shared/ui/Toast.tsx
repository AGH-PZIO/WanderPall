import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import "./toast.css";

export type ToastKind = "ok" | "err" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  text: string;
  count: number;
};

type ToastContextValue = {
  show: (kind: ToastKind, text: string) => void;
  ok: (text: string) => void;
  err: (text: string) => void;
  info: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 3000;
const MAX_VISIBLE = 3;
const DEDUPE_WINDOW_MS = 1500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track when each (kind, text) was last shown so we can fold rapid
  // duplicates into a counter ("Zapisano ×3") instead of spamming the stack.
  const lastShownRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  function scheduleRemoval(id: number) {
    const existing = timersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, DEFAULT_DURATION_MS);
    timersRef.current.set(id, timer);
  }

  const show = useCallback((kind: ToastKind, text: string) => {
    const key = `${kind}::${text}`;
    const now = Date.now();
    const lastShown = lastShownRef.current.get(key) ?? 0;
    lastShownRef.current.set(key, now);

    setToasts((prev) => {
      // If an identical toast is still on screen within the dedupe window,
      // bump its counter instead of adding a new card.
      if (now - lastShown < DEDUPE_WINDOW_MS) {
        const existingIdx = prev.findIndex((t) => t.kind === kind && t.text === text);
        if (existingIdx !== -1) {
          const existing = prev[existingIdx];
          scheduleRemoval(existing.id);
          const updated: Toast = { ...existing, count: existing.count + 1 };
          return [...prev.slice(0, existingIdx), updated, ...prev.slice(existingIdx + 1)];
        }
      }

      const id = now + Math.random();
      // Cap the stack: drop the oldest toast when overflowing so we never
      // fill the screen with a wall of identical popups (point 4).
      const next = [...prev, { id, kind, text, count: 1 }];
      if (next.length > MAX_VISIBLE) {
        const removed = next.shift();
        if (removed) {
          const oldTimer = timersRef.current.get(removed.id);
          if (oldTimer) clearTimeout(oldTimer);
          timersRef.current.delete(removed.id);
        }
      }
      scheduleRemoval(id);
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
    };
  }, []);

  const value: ToastContextValue = {
    show,
    ok: (text) => show("ok", text),
    err: (text) => show("err", text),
    info: (text) => show("info", text),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-overlay" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <span className="toast-icon">
              {t.kind === "ok" ? "✓" : t.kind === "err" ? "✕" : "ℹ"}
            </span>
            <span className="toast-text">
              {t.text}
              {t.count > 1 && <span className="toast-count"> ×{t.count}</span>}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {},
      ok: () => {},
      err: () => {},
      info: () => {},
    };
  }
  return ctx;
}
