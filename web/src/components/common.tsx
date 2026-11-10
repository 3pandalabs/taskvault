"use client";

import { AlertCircle, Loader2, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { errorMessage } from "@/lib/api";
import { dismissToast, useToasts } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5", className)} {...props} />;
}

export function SectionTitle({
  children,
  count,
  tone,
  action,
}: {
  children: React.ReactNode;
  count?: number;
  tone?: "danger" | "default";
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex min-h-8 items-center justify-between gap-2">
      <h2
        className={cn(
          "flex items-center gap-2 text-xs font-semibold uppercase tracking-wider",
          tone === "danger" ? "text-danger" : "text-fg-muted",
        )}
      >
        {children}
        {count !== undefined ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] tabular-nums",
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-2 text-fg-muted",
            )}
          >
            {count}
          </span>
        ) : null}
      </h2>
      {action}
    </div>
  );
}

/** Placeholder rows that keep the page's shape while loading (no layout jump). */
export function Loading({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface" />
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-hidden className={cn("size-4 animate-spin", className)} />;
}

export function LoadError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Panel className="flex flex-col items-center gap-3 py-10 text-center">
      <AlertCircle className="size-8 text-danger" aria-hidden />
      <p className="text-sm text-fg">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Panel>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Panel className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      {icon ? <div className="mb-1 text-accent">{icon}</div> : null}
      <p className="text-base font-semibold text-fg">{title}</p>
      {children ? <div className="max-w-sm text-sm text-fg-muted">{children}</div> : null}
    </Panel>
  );
}

/**
 * Dialog: a bottom sheet on phones, a centered card from `sm` up. Escape and
 * the backdrop close it. Never use window.confirm/alert; use this.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the first field, or the panel itself.
    const first = panel.current?.querySelector<HTMLElement>("input, textarea, select");
    (first ?? panel.current)?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2 sm:px-5">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X />
          </Button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Delete",
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  error?: string | null;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-fg-muted">
        {children}
        <ErrorText>{error}</ErrorText>
      </div>
    </Modal>
  );
}

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-lg",
            t.tone === "error" ? "bg-danger text-white dark:text-zinc-950" : "bg-fg text-bg",
          )}
        >
          <span className="flex-1">{t.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss"
            className="-mr-2 flex size-8 items-center justify-center rounded-full opacity-80 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
