"use client";

import { FileSpreadsheet, FileText, FolderOpen, Globe, Mail, Presentation } from "lucide-react";
import { relativeDue } from "@/lib/dates";
import { useSession } from "@/lib/session";
import type { ISODate, Priority, WorkstreamStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Select } from "./ui/input";

export const PRIORITIES: Priority[] = ["high", "medium", "low"];
export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
export const STATUSES: WorkstreamStatus[] = ["active", "waiting", "done"];
export const STATUS_LABEL: Record<WorkstreamStatus, string> = { active: "Active", waiting: "Waiting", done: "Done" };

const DOT: Record<Priority, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-zinc-500",
};

export function PriorityDot({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      title={`${PRIORITY_LABEL[priority]} priority`}
      className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[priority], className)}
    >
      <span className="sr-only">{PRIORITY_LABEL[priority]} priority</span>
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
      <PriorityDot priority={priority} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

// AdVault Badge tones: active = success, waiting = pending, done = neutral.
const STATUS_STYLE: Record<WorkstreamStatus, string> = {
  active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  waiting: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  done: "border-white/15 bg-white/5 text-zinc-300",
};

export function StatusBadge({ status }: { status: WorkstreamStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Assignee / owner initial(s). null = both. */
export function Avatar({ memberId, className }: { memberId: string | null; className?: string }) {
  const { memberName, memberInitials } = useSession();
  return (
    <span
      title={memberName(memberId)}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        memberId === null ? "border border-white/15 bg-white/5 text-zinc-300" : "border border-violet-400/30 bg-violet-500/15 text-violet-200",
        className,
      )}
    >
      {memberInitials(memberId)}
      <span className="sr-only">: {memberName(memberId)}</span>
    </span>
  );
}

const DUE_TONE = {
  overdue: "text-red-300 font-medium",
  today: "text-amber-300 font-medium",
  soon: "text-zinc-200",
  later: "text-zinc-400",
} as const;

export function DueLabel({ due, today, className }: { due: ISODate; today: ISODate; className?: string }) {
  const r = relativeDue(due, today);
  return <span className={cn("whitespace-nowrap text-xs", DUE_TONE[r.tone], className)}>{r.label}</span>;
}

/** Owner / assignee picker. "" = Both (null). */
export function MemberSelect({
  value,
  onChange,
  id,
  className,
  bothLabel = "Both",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  id?: string;
  className?: string;
  bothLabel?: string;
}) {
  const { members } = useSession();
  return (
    <Select id={id} className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{bothLabel}</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </Select>
  );
}

export function PrioritySelect({
  value,
  onChange,
  id,
  className,
}: {
  value: Priority;
  onChange: (v: Priority) => void;
  id?: string;
  className?: string;
}) {
  return (
    <Select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value as Priority)}>
      {PRIORITIES.map((p) => (
        <option key={p} value={p}>
          {PRIORITY_LABEL[p]} priority
        </option>
      ))}
    </Select>
  );
}

// ---- links ----

export type LinkKind = "drive" | "docs" | "sheets" | "slides" | "gmail" | "other";

export function linkInfo(url: string): { kind: LinkKind; host: string } {
  let host = url;
  let path = "";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    path = u.pathname;
  } catch {
    return { kind: "other", host: url };
  }
  if (host === "drive.google.com") return { kind: "drive", host };
  if (host === "docs.google.com") {
    if (path.startsWith("/spreadsheets")) return { kind: "sheets", host };
    if (path.startsWith("/presentation")) return { kind: "slides", host };
    return { kind: "docs", host };
  }
  if (host === "mail.google.com") return { kind: "gmail", host };
  return { kind: "other", host };
}

const LINK_LABEL: Record<LinkKind, string> = {
  drive: "Google Drive",
  docs: "Google Docs",
  sheets: "Google Sheets",
  slides: "Google Slides",
  gmail: "Gmail",
  other: "Link",
};

export function LinkIcon({ kind, className }: { kind: LinkKind; className?: string }) {
  const cls = cn("size-5 shrink-0", className);
  switch (kind) {
    case "drive":
      return <FolderOpen className={cn(cls, "text-amber-400")} aria-label={LINK_LABEL[kind]} />;
    case "docs":
      return <FileText className={cn(cls, "text-sky-400")} aria-label={LINK_LABEL[kind]} />;
    case "sheets":
      return <FileSpreadsheet className={cn(cls, "text-emerald-400")} aria-label={LINK_LABEL[kind]} />;
    case "slides":
      return <Presentation className={cn(cls, "text-orange-400")} aria-label={LINK_LABEL[kind]} />;
    case "gmail":
      return <Mail className={cn(cls, "text-red-400")} aria-label={LINK_LABEL[kind]} />;
    default:
      return <Globe className={cn(cls, "text-fg-muted")} aria-label={LINK_LABEL[kind]} />;
  }
}
