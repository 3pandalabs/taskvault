// Calendar-date helpers. The API sends dates as `YYYY-MM-DD` with no time and
// no zone. `new Date("2026-11-09")` parses that as UTC midnight, which renders
// as Nov 8 anywhere west of Greenwich, so nothing here goes through it: dates
// become whole day numbers, and formatting pins timeZone "UTC" to the same
// UTC-midnight instant they were built from.

import type { ISODate } from "./types";

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function isISODate(s: string | null | undefined): s is ISODate {
  return !!s && RE.test(s);
}

/** Days since 1970-01-01 for a calendar date (NaN if malformed). */
function dayNumber(s: ISODate): number {
  const m = RE.exec(s);
  if (!m) return NaN;
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS);
}

function fromDayNumber(n: number): ISODate {
  const d = new Date(n * DAY_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** `to − from` in whole days. */
export function daysBetween(from: ISODate, to: ISODate): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(s: ISODate, n: number): ISODate {
  return fromDayNumber(dayNumber(s) + n);
}

/** Today's calendar date in an IANA zone (the browser's when omitted or invalid). */
export function todayIn(timeZone?: string): ISODate {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }
}

/** Formats a calendar date for display, e.g. "Nov 9" or "Nov 9, 2027". */
export function formatDate(s: ISODate, opts?: Intl.DateTimeFormatOptions, today?: ISODate): string {
  const n = dayNumber(s);
  if (Number.isNaN(n)) return s;
  const sameYear = today ? today.slice(0, 4) === s.slice(0, 4) : true;
  const o: Intl.DateTimeFormatOptions = opts ?? {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  };
  return new Intl.DateTimeFormat(undefined, { ...o, timeZone: "UTC" }).format(new Date(n * DAY_MS));
}

export type DueTone = "overdue" | "today" | "soon" | "later";

/** "today", "tomorrow", "in 3 days", "2 days overdue", or "Dec 4" for later dates. */
export function relativeDue(due: ISODate, today: ISODate): { label: string; tone: DueTone } {
  const diff = daysBetween(today, due);
  if (Number.isNaN(diff)) return { label: due, tone: "later" };
  if (diff < 0) return { label: `${-diff} day${diff === -1 ? "" : "s"} overdue`, tone: "overdue" };
  if (diff === 0) return { label: "today", tone: "today" };
  if (diff === 1) return { label: "tomorrow", tone: "soon" };
  if (diff <= 13) return { label: `in ${diff} days`, tone: diff <= 7 ? "soon" : "later" };
  return { label: formatDate(due, undefined, today), tone: "later" };
}

/** Sort key for tasks the way ROUTES.md does: open first (due asc, nulls last, then priority), then done (doneAt desc). */
const PRI: Record<string, number> = { high: 0, medium: 1, low: 2 };
export function compareTasks(
  a: { status: string; dueDate: ISODate | null; priority: string; doneAt: string | null; title: string },
  b: { status: string; dueDate: ISODate | null; priority: string; doneAt: string | null; title: string },
): number {
  if (a.status !== b.status) return a.status === "open" ? -1 : 1;
  if (a.status === "done") return (b.doneAt ?? "").localeCompare(a.doneAt ?? "");
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  }
  return (PRI[a.priority] ?? 1) - (PRI[b.priority] ?? 1) || a.title.localeCompare(b.title);
}
