"use client";

import { useEffect } from "react";

/**
 * Unconditionally registers /sw.js so the offline page + push contract are
 * available regardless of whether the user has interacted with notification
 * prompts. Safe to mount on every page — `register()` is idempotent.
 *
 * Per R-Q2-E-016 — offline-page-active KPI requires SW registration on first
 * visit, not on first push opt-in.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Defer to idle so SW install doesn't compete with first-paint network.
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 1500);
    idle(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failures (private mode, unsupported, etc) are non-fatal.
      });
    });
  }, []);
  return null;
}
