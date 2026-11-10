// Reminder + daily digest sweep (ROUTES.md "Reminders"). Runs inside the API
// process every 15 minutes (plus once ~30s after boot); off when
// REMINDERS_ENABLED=false. The decisions are pure (lib/reminders.ts,
// lib/today.ts); this file does the I/O.
//
// Overlap-safe by CLAIM-THEN-SEND: a reminder is sent only for rows this sweep
// inserted (`ON CONFLICT DO NOTHING RETURNING`), and a digest only when this
// sweep's conditional UPDATE of last_digest_date matched. Two sweeps (or two
// containers) racing therefore never double-send. A claim whose email then
// fails is RELEASED (row deleted / last_digest_date restored) so the next
// sweep retries it. With no mail transport configured the sweep does nothing
// at all, so a deploy before mail is set up doesn't burn any reminders.
//
// Logs carry ids and counts only, never titles, notes or addresses.
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { taskReminders, tasks, users, workstreams } from "../db/schema.js";
import { env } from "../env.js";
import { digestIsEmpty, digestMail, reminderMail, type Mail } from "../lib/emails.js";
import { mailerConfigured, sendMail } from "../lib/mailer.js";
import { claimsToRelease, digestDueDate, dueReminders, type ClaimTag, type ReminderStage } from "../lib/reminders.js";
import { bucketTasks, selectNextSteps } from "../lib/today.js";

const INTERVAL_MS = 15 * 60 * 1000;
const FIRST_RUN_MS = 30_000;

function log(msg: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", component: "reminders", msg, ...fields }));
}

export type SweepResult = {
  candidates: number;
  claimed: number;
  digestsClaimed: number;
  delivered: number;
  failed: number;
  skipped: number;
  released: number;
};

let warnedNoMail = false;

export async function runSweepOnce(now = new Date()): Promise<SweepResult> {
  if (!mailerConfigured()) {
    if (!warnedNoMail) log("mail disabled: reminder sweep skipped, nothing claimed");
    warnedNoMail = true;
    return { candidates: 0, claimed: 0, digestsClaimed: 0, delivered: 0, failed: 0, skipped: 0, released: 0 };
  }
  const allUsers = await db.select().from(users);
  // Every open dated task up to ~9 days out (a small buffer over +7 for far-
  // east timezones). Overdue ones are included for the digest.
  const taskRows = await db
    .select({ task: tasks, workstreamTitle: workstreams.title })
    .from(tasks)
    .innerJoin(workstreams, eq(workstreams.id, tasks.workstreamId))
    .where(and(eq(tasks.status, "open"), sql`${tasks.dueDate} is not null`, sql`${tasks.dueDate} <= current_date + 9`));
  const taskById = new Map(taskRows.map((r) => [r.task.id, r]));
  const userById = new Map(allUsers.map((u) => [u.id, u]));

  // --- task reminders: claim, then send what we claimed -------------------
  const candidates = dueReminders(
    taskRows.map((r) => r.task),
    allUsers,
    now,
  );
  const claimed: { taskId: string; userId: string; stage: string }[] = [];
  for (let i = 0; i < candidates.length; i += 500) {
    const chunk = candidates.slice(i, i + 500);
    const rows = await db
      .insert(taskReminders)
      .values(chunk)
      .onConflictDoNothing({ target: [taskReminders.taskId, taskReminders.userId, taskReminders.stage] })
      .returning({ taskId: taskReminders.taskId, userId: taskReminders.userId, stage: taskReminders.stage });
    claimed.push(...rows);
  }
  const mails: Mail[] = [];
  const tags: ClaimTag[] = [];
  for (const c of claimed) {
    const t = taskById.get(c.taskId);
    const u = userById.get(c.userId);
    if (!t || !u) continue;
    mails.push(
      reminderMail(env.WEB_URL, {
        to: u.email,
        stage: c.stage as ReminderStage,
        taskTitle: t.task.title,
        workstreamId: t.task.workstreamId,
        workstreamTitle: t.workstreamTitle,
        dueDate: t.task.dueDate!,
        notes: t.task.notes,
      }),
    );
    tags.push({ kind: "reminder", ...c });
  }

  // --- daily digest: once per recipient-local day --------------------------
  const digestUsers = allUsers.flatMap((u) => {
    const date = digestDueDate(u, now);
    return date ? [{ user: u, date }] : [];
  });
  let digestsClaimed = 0;
  if (digestUsers.length) {
    const households = [...new Set(digestUsers.map((d) => d.user.householdId))];
    const wsRows = await db
      .select()
      .from(workstreams)
      .where(and(inArray(workstreams.householdId, households), inArray(workstreams.status, ["active", "waiting"])));
    for (const { user, date } of digestUsers) {
      const householdTasks = taskRows
        .filter((r) => r.task.householdId === user.householdId)
        .map((r) => ({ ...r.task, workstreamTitle: r.workstreamTitle }));
      const content = {
        ...bucketTasks(householdTasks, date),
        nextSteps: selectNextSteps(wsRows.filter((w) => w.householdId === user.householdId)),
      };
      // Nothing to say: don't mark the day, a task added later can still trigger it.
      if (digestIsEmpty(content)) continue;
      const won = await db
        .update(users)
        .set({ lastDigestDate: date })
        .where(and(eq(users.id, user.id), or(isNull(users.lastDigestDate), lt(users.lastDigestDate, date))))
        .returning({ id: users.id });
      if (!won.length) continue;
      digestsClaimed++;
      mails.push(digestMail(env.WEB_URL, user.email, user.name, date, content));
      tags.push({ kind: "digest", userId: user.id, date, previous: user.lastDigestDate });
    }
  }

  // One message per send so each claim gets its own outcome (volumes are tiny).
  const delivered: boolean[] = [];
  const sent = { delivered: 0, failed: 0, skipped: 0 };
  for (const m of mails) {
    const r = await sendMail([m], (msg) => log(msg));
    delivered.push(r.delivered > 0 && r.failed === 0);
    sent.delivered += r.delivered;
    sent.failed += r.failed;
    sent.skipped += r.skipped;
  }

  // Release the claims of anything not delivered, so the next sweep retries.
  const release = claimsToRelease(tags, delivered);
  for (const r of release.reminders) {
    await db
      .delete(taskReminders)
      .where(and(eq(taskReminders.taskId, r.taskId), eq(taskReminders.userId, r.userId), eq(taskReminders.stage, r.stage)));
  }
  for (const d of release.digests) {
    await db
      .update(users)
      .set({ lastDigestDate: d.previous })
      .where(and(eq(users.id, d.userId), eq(users.lastDigestDate, d.date)));
  }
  const released = release.reminders.length + release.digests.length;
  return { candidates: candidates.length, claimed: claimed.length, digestsClaimed, ...sent, released };
}

let started = false;
let running = false;

/** Every 15 min plus one run ~30s after start. Timers are unref'd. */
export function startReminderSweep(): void {
  if (started) return;
  started = true;
  const run = () => {
    if (running) return; // in-process overlap guard; the DB claims cover the rest
    running = true;
    runSweepOnce()
      .then((r) => log("sweep done", r))
      .catch((err) => log("sweep failed", { error: (err as Error)?.message?.slice(0, 200) }))
      .finally(() => {
        running = false;
      });
  };
  setTimeout(run, FIRST_RUN_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
}
