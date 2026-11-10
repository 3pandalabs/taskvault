import { describe, expect, it } from "vitest";
import { claimsToRelease, digestDueDate, dueReminders, isQuietHour, stageFor, type ReminderTask, type ReminderUser } from "../src/lib/reminders.js";

describe("stageFor", () => {
  it("maps 7/1/0/-1 days left to stages and nothing else", () => {
    expect(stageFor(7)).toBe("7");
    expect(stageFor(1)).toBe("1");
    expect(stageFor(0)).toBe("0");
    expect(stageFor(-1)).toBe("overdue");
    for (const d of [8, 6, 5, 2, -2, -30]) expect(stageFor(d)).toBeNull();
  });
});

describe("isQuietHour", () => {
  it("is quiet from 22:00 to 06:59", () => {
    for (const h of [22, 23, 0, 3, 6]) expect(isQuietHour(h)).toBe(true);
    for (const h of [7, 9, 12, 21]) expect(isQuietHour(h)).toBe(false);
  });
});

const H = "h1";
const ny: ReminderUser = { id: "u-ny", householdId: H, timezone: "America/New_York" };
const ind: ReminderUser = { id: "u-in", householdId: H, timezone: "Asia/Kolkata" };
const other: ReminderUser = { id: "u-other", householdId: "h2", timezone: "America/New_York" };
const task = (over: Partial<ReminderTask>): ReminderTask => ({
  id: "t1",
  householdId: H,
  dueDate: "2026-11-16",
  status: "open",
  assigneeId: null,
  ...over,
});

describe("dueReminders", () => {
  // 2026-11-09 15:00 UTC = 10:00 New York (Nov 9), 20:30 India (Nov 9)
  const now = new Date("2026-11-09T15:00:00Z");

  it("sends the 7-day stage to every household member when unassigned", () => {
    const out = dueReminders([task({})], [ny, ind, other], now);
    expect(out).toEqual([
      { taskId: "t1", userId: "u-ny", stage: "7" },
      { taskId: "t1", userId: "u-in", stage: "7" },
    ]);
  });

  it("sends only to the assignee when assigned", () => {
    const out = dueReminders([task({ assigneeId: "u-in" })], [ny, ind], now);
    expect(out).toEqual([{ taskId: "t1", userId: "u-in", stage: "7" }]);
  });

  it("covers 1, 0 and overdue stages", () => {
    const tasks = [
      task({ id: "a", dueDate: "2026-11-10" }),
      task({ id: "b", dueDate: "2026-11-09" }),
      task({ id: "c", dueDate: "2026-11-08" }),
      task({ id: "d", dueDate: "2026-11-07" }), // 2 days overdue: no new stage
      task({ id: "e", dueDate: "2026-11-12" }), // 3 days: nothing
    ];
    const out = dueReminders(tasks, [ny], now);
    expect(out).toEqual([
      { taskId: "a", userId: "u-ny", stage: "1" },
      { taskId: "b", userId: "u-ny", stage: "0" },
      { taskId: "c", userId: "u-ny", stage: "overdue" },
    ]);
  });

  it("skips done and undated tasks", () => {
    expect(dueReminders([task({ status: "done" }), task({ dueDate: null })], [ny], now)).toEqual([]);
  });

  it("computes daysLeft in each recipient's own timezone", () => {
    // 2026-11-10 02:00 UTC: New York is 21:00 on Nov 9; India is 07:30 on Nov 10.
    const t = new Date("2026-11-10T02:00:00Z");
    const out = dueReminders([task({ dueDate: "2026-11-10" })], [ny, ind], t);
    expect(out).toEqual([
      { taskId: "t1", userId: "u-ny", stage: "1" },
      { taskId: "t1", userId: "u-in", stage: "0" },
    ]);
  });

  it("never sends in quiet hours (22:00-07:00 local); the next sweep picks it up", () => {
    // 2026-11-10 03:30 UTC: New York 22:30 (quiet), India 09:00
    const quiet = new Date("2026-11-10T03:30:00Z");
    expect(dueReminders([task({ dueDate: "2026-11-17" })], [ny, ind], quiet)).toEqual([
      { taskId: "t1", userId: "u-in", stage: "7" },
    ]);
    // 06:59 New York (11:59 UTC) still quiet; 07:00 sends
    expect(dueReminders([task({ dueDate: "2026-11-17" })], [ny], new Date("2026-11-10T11:59:00Z"))).toEqual([]);
    expect(dueReminders([task({ dueDate: "2026-11-17" })], [ny], new Date("2026-11-10T12:00:00Z"))).toEqual([
      { taskId: "t1", userId: "u-ny", stage: "7" },
    ]);
  });

  it("ignores an assignee from another household", () => {
    expect(dueReminders([task({ assigneeId: "u-other" })], [ny, other], now)).toEqual([]);
  });
});

describe("digestDueDate", () => {
  const user = { timezone: "America/New_York", digestEnabled: true, lastDigestDate: null as string | null };

  it("is due at or after 07:00 local when not sent today", () => {
    expect(digestDueDate(user, new Date("2026-11-09T12:00:00Z"))).toBe("2026-11-09"); // 07:00 NY
    expect(digestDueDate(user, new Date("2026-11-09T11:59:00Z"))).toBeNull(); // 06:59 NY
  });

  it("is sent once per local day", () => {
    const now = new Date("2026-11-09T15:00:00Z");
    expect(digestDueDate({ ...user, lastDigestDate: "2026-11-09" }, now)).toBeNull();
    expect(digestDueDate({ ...user, lastDigestDate: "2026-11-08" }, now)).toBe("2026-11-09");
  });

  it("uses the local day, not the UTC day", () => {
    // 2026-11-10 02:00 UTC is still Nov 9, 21:00 in New York: already sent → no
    expect(digestDueDate({ ...user, lastDigestDate: "2026-11-09" }, new Date("2026-11-10T02:00:00Z"))).toBeNull();
    // India is on Nov 10 at 07:30
    expect(
      digestDueDate({ timezone: "Asia/Kolkata", digestEnabled: true, lastDigestDate: "2026-11-09" }, new Date("2026-11-10T02:00:00Z")),
    ).toBe("2026-11-10");
  });

  it("respects digestEnabled and quiet hours", () => {
    expect(digestDueDate({ ...user, digestEnabled: false }, new Date("2026-11-09T15:00:00Z"))).toBeNull();
    expect(digestDueDate(user, new Date("2026-11-10T03:30:00Z"))).toBeNull(); // 22:30 NY
  });
});

describe("claimsToRelease", () => {
  it("releases exactly the claims whose message was not delivered", () => {
    const tags = [
      { kind: "reminder" as const, taskId: "t1", userId: "u1", stage: "7" },
      { kind: "reminder" as const, taskId: "t2", userId: "u1", stage: "0" },
      { kind: "digest" as const, userId: "u1", date: "2026-11-09", previous: null },
      { kind: "digest" as const, userId: "u2", date: "2026-11-10", previous: "2026-11-09" },
    ];
    expect(claimsToRelease(tags, [true, false, true, false])).toEqual({
      reminders: [{ taskId: "t2", userId: "u1", stage: "0" }],
      digests: [{ userId: "u2", date: "2026-11-10", previous: "2026-11-09" }],
    });
  });

  it("releases everything when nothing was delivered, nothing when all were", () => {
    const tags = [{ kind: "reminder" as const, taskId: "t1", userId: "u1", stage: "1" }];
    expect(claimsToRelease(tags, [false]).reminders).toHaveLength(1);
    expect(claimsToRelease(tags, [true])).toEqual({ reminders: [], digests: [] });
    expect(claimsToRelease(tags, []).reminders).toHaveLength(1); // missing outcome = not delivered
  });
});
