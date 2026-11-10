"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js, which exists only for PWA installability and caches
 * nothing. Skipped in `next dev` unless the URL has ?sw=1, to keep HMR simple.
 */
export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production" && !window.location.search.includes("sw=1")) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
