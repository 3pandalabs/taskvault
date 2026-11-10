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
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-zinc-400 dark:bg-zinc-500",
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-fg-muted">
      <PriorityDot priority={priority} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const STATUS_STYLE: Record<WorkstreamStatus, string> = {
  active: "bg-accent-soft text-accent",
  waiting: "bg-warn-soft text-warn",
  done: "bg-surface-2 text-fg-muted",
};

export function StatusBadge({ status }: { status: WorkstreamStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", STATUS_STYLE[status])}>
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
        memberId === null ? "bg-surface-2 text-fg-muted" : "bg-accent-soft text-accent",
        className,
      )}
    >
      {memberInitials(memberId)}
      <span className="sr-only">: {memberName(memberId)}</span>
    </span>
  );
}

const DUE_TONE = {
  overdue: "text-danger font-medium",
  today: "text-warn font-medium",
  soon: "text-fg",
  later: "text-fg-muted",
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
      return <FolderOpen className={cn(cls, "text-amber-500")} aria-label={LINK_LABEL[kind]} />;
    case "docs":
      return <FileText className={cn(cls, "text-blue-500")} aria-label={LINK_LABEL[kind]} />;
    case "sheets":
      return <FileSpreadsheet className={cn(cls, "text-green-600")} aria-label={LINK_LABEL[kind]} />;
    case "slides":
      return <Presentation className={cn(cls, "text-orange-500")} aria-label={LINK_LABEL[kind]} />;
    case "gmail":
      return <Mail className={cn(cls, "text-red-500")} aria-label={LINK_LABEL[kind]} />;
    default:
      return <Globe className={cn(cls, "text-fg-muted")} aria-label={LINK_LABEL[kind]} />;
  }
}
