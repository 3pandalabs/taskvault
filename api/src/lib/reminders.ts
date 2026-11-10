// Reminder stage + digest selection logic (ROUTES.md "Reminders"). Pure: no
// env/db imports. src/reminders/sweep.ts feeds it rows and does the I/O.
import { daysBetween, localParts } from "./dates.js";

export type ReminderStage = "7" | "1" | "0" | "overdue";

/** Quiet hours: never send between 22:00 and 07:00 recipient-local. */
export const QUIET_START = 22;
export const QUIET_END = 7;

export function isQuietHour(hour: number): boolean {
  return hour >= QUIET_START || hour < QUIET_END;
}

/** The stage for `daysLeft` (dueDate - local today), or null if no email today. */
export function stageFor(daysLeft: number): ReminderStage | null {
  if (daysLeft === 7) return "7";
  if (daysLeft === 1) return "1";
  if (daysLeft === 0) return "0";
  if (daysLeft === -1) return "overdue";
  return null;
}

export type ReminderTask = {
  id: string;
  householdId: string;
  dueDate: string | null;
  status: "open" | "done";
  assigneeId: string | null;
};

export type ReminderUser = { id: string; householdId: string; timezone: string };

export type ReminderCandidate = { taskId: string; userId: string; stage: ReminderStage };

/**
 * Every (task, user, stage) that is due to be sent at `now`. Recipients are
 * the assignee, or every household member when the task is unassigned. The
 * caller claims each candidate (unique row, ON CONFLICT DO NOTHING) before
 * sending, so returning one that was already sent is harmless.
 */
export function dueReminders(tasks: ReminderTask[], users: ReminderUser[], now: Date): ReminderCandidate[] {
  const byHousehold = new Map<string, ReminderUser[]>();
  for (const u of users) {
    const list = byHousehold.get(u.householdId) ?? [];
    list.push(u);
    byHousehold.set(u.householdId, list);
  }
  const local = new Map<string, { date: string; hour: number }>();
  const localFor = (u: ReminderUser) => {
    let l = local.get(u.id);
    if (!l) {
      l = localParts(now, u.timezone);
      local.set(u.id, l);
    }
    return l;
  };

  const out: ReminderCandidate[] = [];
  for (const t of tasks) {
    if (t.status !== "open" || !t.dueDate) continue;
    const members = byHousehold.get(t.householdId) ?? [];
    const recipients = t.assigneeId ? members.filter((m) => m.id === t.assigneeId) : members;
    for (const u of recipients) {
      const { date, hour } = localFor(u);
      if (isQuietHour(hour)) continue;
      const stage = stageFor(daysBetween(date, t.dueDate));
      if (stage) out.push({ taskId: t.id, userId: u.id, stage });
    }
  }
  return out;
}

export type DigestUser = { timezone: string; digestEnabled: boolean; lastDigestDate: string | null };

/**
 * Whether the daily digest is due for this user at `now`: enabled, recipient-
 * local hour >= 07:00 and before the 22:00 quiet hours, and not yet sent for
 * the local day. Returns the local date to record, or null.
 */
export function digestDueDate(user: DigestUser, now: Date): string | null {
  if (!user.digestEnabled) return null;
  const { date, hour } = localParts(now, user.timezone);
  if (isQuietHour(hour)) return null;
  if (user.lastDigestDate !== null && user.lastDigestDate >= date) return null;
  return date;
}

// ------------------------------------------------------------ rollback --

/** What a claimed email was for, so a failed send can be un-claimed. */
export type ClaimTag =
  | { kind: "reminder"; taskId: string; userId: string; stage: string }
  | { kind: "digest"; userId: string; date: string; previous: string | null };

/**
 * Claims to release after sending: every message that was not delivered.
 * `delivered[i]` is the outcome of the message tagged `tags[i]`. Releasing a
 * reminder deletes its task_reminders row; releasing a digest restores the
 * user's previous last_digest_date. The next sweep then retries them.
 */
export function claimsToRelease(tags: ClaimTag[], delivered: boolean[]) {
  const reminders: { taskId: string; userId: string; stage: string }[] = [];
  const digests: { userId: string; date: string; previous: string | null }[] = [];
  tags.forEach((t, i) => {
    if (delivered[i]) return;
    if (t.kind === "reminder") reminders.push({ taskId: t.taskId, userId: t.userId, stage: t.stage });
    else digests.push({ userId: t.userId, date: t.date, previous: t.previous });
  });
  return { reminders, digests };
}
