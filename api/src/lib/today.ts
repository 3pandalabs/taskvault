// Today bucketing, workstream summaries and the ROUTES.md sort orders.
// Pure: no env/db imports.
import { addDays } from "./dates.js";
import type { NextStepItem, Priority, WorkstreamStatus, WorkstreamSummary, WorkstreamView } from "./types.js";

export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

type DueTask = { dueDate: string | null; priority: Priority; status: "open" | "done" };

const byTitle = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });

/** dueDate asc (nulls last), then priority (high first). */
export function compareByDueThenPriority(a: DueTask, b: DueTask): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
}

export type Buckets<T> = { overdue: T[]; dueToday: T[]; thisWeek: T[] };

/**
 * Open tasks split relative to `today` (YYYY-MM-DD, already in the caller's tz):
 * overdue (< today), dueToday (== today), thisWeek (today < due <= today+7).
 * Done tasks and undated tasks are dropped. Each list is sorted.
 */
export function bucketTasks<T extends DueTask>(tasks: T[], today: string): Buckets<T> {
  const weekEnd = addDays(today, 7);
  const out: Buckets<T> = { overdue: [], dueToday: [], thisWeek: [] };
  for (const t of tasks) {
    if (t.status !== "open" || !t.dueDate) continue;
    if (t.dueDate < today) out.overdue.push(t);
    else if (t.dueDate === today) out.dueToday.push(t);
    else if (t.dueDate <= weekEnd) out.thisWeek.push(t);
  }
  out.overdue.sort(compareByDueThenPriority);
  out.dueToday.sort(compareByDueThenPriority);
  out.thisWeek.sort(compareByDueThenPriority);
  return out;
}

type WsLike = { id: string; title: string; priority: Priority; status: WorkstreamStatus; nextStep: string | null };

/** Active/waiting workstreams with a non-empty nextStep, by priority then title. */
export function selectNextSteps(workstreams: WsLike[]): NextStepItem[] {
  return workstreams
    .filter((w) => w.status !== "done" && w.nextStep !== null && w.nextStep.trim() !== "")
    .map((w) => ({ workstreamId: w.id, title: w.title, priority: w.priority, status: w.status, nextStep: w.nextStep!.trim() }))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byTitle(a.title, b.title));
}

type SummaryTask = { id: string; workstreamId: string; title: string; dueDate: string | null; priority: Priority; status: "open" | "done" };

/** Adds openTasks / overdueTasks / nextDue to each workstream (overdue relative to `today`). */
export function summarize(workstreams: WorkstreamView[], tasks: SummaryTask[], today: string): WorkstreamSummary[] {
  const byWs = new Map<string, SummaryTask[]>();
  for (const t of tasks) {
    if (t.status !== "open") continue;
    const list = byWs.get(t.workstreamId) ?? [];
    list.push(t);
    byWs.set(t.workstreamId, list);
  }
  return workstreams.map((w) => {
    const open = byWs.get(w.id) ?? [];
    const dated = open.filter((t) => t.dueDate !== null).sort(compareByDueThenPriority);
    const first = dated[0];
    return {
      ...w,
      openTasks: open.length,
      overdueTasks: dated.filter((t) => t.dueDate! < today).length,
      nextDue: first ? { taskId: first.id, title: first.title, dueDate: first.dueDate! } : null,
    };
  });
}

/** priority (high first), then nextDue.dueDate (soonest, nulls last), then title. */
export function sortSummaries(list: WorkstreamSummary[]): WorkstreamSummary[] {
  return [...list].sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p) return p;
    const ad = a.nextDue?.dueDate ?? null;
    const bd = b.nextDue?.dueDate ?? null;
    if (ad !== bd) {
      if (ad === null) return 1;
      if (bd === null) return -1;
      return ad < bd ? -1 : 1;
    }
    return byTitle(a.title, b.title);
  });
}

/** Open first (dueDate asc nulls last, then priority), then done (doneAt desc). */
export function sortWorkstreamTasks<T extends DueTask & { doneAt: string | null }>(tasks: T[]): T[] {
  const open = tasks.filter((t) => t.status === "open").sort(compareByDueThenPriority);
  const done = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return [...open, ...done];
}
