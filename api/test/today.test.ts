import { describe, expect, it } from "vitest";
import { bucketTasks, selectNextSteps, sortSummaries, sortWorkstreamTasks, summarize } from "../src/lib/today.js";
import type { Priority, WorkstreamSummary, WorkstreamView } from "../src/lib/types.js";

type T = { id: string; workstreamId: string; title: string; dueDate: string | null; priority: Priority; status: "open" | "done"; doneAt: string | null };
const t = (id: string, dueDate: string | null, priority: Priority = "medium", status: "open" | "done" = "open", ws = "w1"): T => ({
  id,
  workstreamId: ws,
  title: id,
  dueDate,
  priority,
  status,
  doneAt: status === "done" ? `2026-11-0${id.length}T00:00:00.000Z` : null,
});

describe("bucketTasks", () => {
  const today = "2026-11-09";
  it("splits open tasks into overdue / due today / this week (<= today+7)", () => {
    const b = bucketTasks(
      [t("old", "2026-11-01"), t("y", "2026-11-08"), t("now", today), t("wk", "2026-11-16"), t("far", "2026-11-17"), t("nodate", null), t("done", "2026-11-08", "high", "done")],
      today,
    );
    expect(b.overdue.map((x) => x.id)).toEqual(["old", "y"]);
    expect(b.dueToday.map((x) => x.id)).toEqual(["now"]);
    expect(b.thisWeek.map((x) => x.id)).toEqual(["wk"]);
  });

  it("sorts each list by dueDate, then priority high first", () => {
    const b = bucketTasks([t("l", "2026-11-10", "low"), t("h", "2026-11-10", "high"), t("m", "2026-11-10", "medium"), t("first", "2026-11-09")], "2026-11-08");
    expect(b.thisWeek.map((x) => x.id)).toEqual(["first", "h", "m", "l"]);
  });
});

describe("selectNextSteps", () => {
  it("keeps active/waiting with non-empty nextStep, sorted by priority then title", () => {
    const out = selectNextSteps([
      { id: "1", title: "office", priority: "low", status: "active", nextStep: "call landlord" },
      { id: "2", title: "EB5", priority: "high", status: "waiting", nextStep: "wait for USCIS" },
      { id: "3", title: "car", priority: "high", status: "active", nextStep: " renew " },
      { id: "4", title: "done one", priority: "high", status: "done", nextStep: "x" },
      { id: "5", title: "blank", priority: "high", status: "active", nextStep: "  " },
      { id: "6", title: "null", priority: "high", status: "active", nextStep: null },
    ]);
    expect(out.map((s) => s.workstreamId)).toEqual(["3", "2", "1"]);
    expect(out[0].nextStep).toBe("renew");
  });
});

const ws = (id: string, title: string, priority: Priority): WorkstreamView => ({
  id,
  title,
  description: null,
  status: "active",
  priority,
  ownerId: null,
  nextStep: null,
  notes: null,
  createdAt: "",
  updatedAt: "",
});

describe("summarize + sortSummaries", () => {
  it("counts open/overdue and picks the earliest dated open task as nextDue", () => {
    const [s] = summarize(
      [ws("w1", "EB5", "high")],
      [t("a", "2026-11-20"), t("b", "2026-11-01"), t("c", null), t("d", "2026-10-01", "high", "done")],
      "2026-11-09",
    );
    expect(s.openTasks).toBe(3);
    expect(s.overdueTasks).toBe(1);
    expect(s.nextDue).toEqual({ taskId: "b", title: "b", dueDate: "2026-11-01" });
  });

  it("sorts by priority, then nextDue soonest (nulls last), then title", () => {
    const mk = (id: string, title: string, priority: Priority, due: string | null): WorkstreamSummary => ({
      ...ws(id, title, priority),
      openTasks: 0,
      overdueTasks: 0,
      nextDue: due ? { taskId: "x", title: "x", dueDate: due } : null,
    });
    const out = sortSummaries([
      mk("1", "zeta", "high", null),
      mk("2", "beta", "medium", "2026-11-01"),
      mk("3", "Alpha", "high", null),
      mk("4", "gamma", "high", "2026-12-01"),
      mk("5", "delta", "high", "2026-11-15"),
    ]);
    expect(out.map((x) => x.id)).toEqual(["5", "4", "3", "1", "2"]);
  });
});

describe("sortWorkstreamTasks", () => {
  it("puts open first (due asc, nulls last, then priority), then done by doneAt desc", () => {
    const out = sortWorkstreamTasks([
      t("nodate", null, "high"),
      t("d1", "2026-11-10", "low"),
      t("d2", "2026-11-10", "high"),
      { ...t("old", "2026-11-01", "medium", "done"), doneAt: "2026-11-01T00:00:00.000Z" },
      { ...t("new", "2026-11-01", "medium", "done"), doneAt: "2026-11-05T00:00:00.000Z" },
    ]);
    expect(out.map((x) => x.id)).toEqual(["d2", "d1", "nodate", "new", "old"]);
  });
});
