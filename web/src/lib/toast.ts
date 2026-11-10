"use client";

import { useSyncExternalStore } from "react";

// Tiny app-wide toast store (errors from optimistic updates, short confirmations).
export type Toast = { id: number; text: string; tone: "error" | "info" };

let toasts: Toast[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function toast(text: string, tone: Toast["tone"] = "info") {
  const id = ++seq;
  toasts = [...toasts.slice(-2), { id, text, tone }];
  emit();
  setTimeout(() => dismissToast(id), tone === "error" ? 6000 : 3000);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const EMPTY: Toast[] = [];
export function useToasts() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },
    () => toasts,
    () => EMPTY,
  );
}

// ---- "data changed" signal ----
// The floating quick-add lives in the shell; pages listen so they can reload.
const CHANGED = "taskvault:changed";
export function notifyChanged() {
  window.dispatchEvent(new Event(CHANGED));
}
export function onChanged(cb: () => void) {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
}
