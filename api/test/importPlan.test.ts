import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/lib/csv.js";
import { ImportError, mapHeader, parseDue, parseOwner, parsePriority, parseStatus, planImport } from "../src/lib/importPlan.js";

const members = [
  { id: "u1", name: "Alex" },
  { id: "u2", name: "Sam" },
];

describe("parseDue", () => {
  it("accepts YYYY-MM-DD, M/D/YYYY and D-Mon-YYYY", () => {
    expect(parseDue("2026-11-09")).toBe("2026-11-09");
    expect(parseDue("2026-1-5")).toBe("2026-01-05");
    expect(parseDue("11/9/2026")).toBe("2026-11-09");
    expect(parseDue("01/05/2027")).toBe("2027-01-05"); // US order: Jan 5
    expect(parseDue("5-Jan-2027")).toBe("2027-01-05");
    expect(parseDue("05-jan-2027")).toBe("2027-01-05");
    expect(parseDue("9-Sept-2027")).toBe("2027-09-09");
    expect(parseDue("9 November 2027")).toBe("2027-11-09");
    expect(parseDue("  ")).toBeNull();
  });

  it("rejects impossible or unknown dates", () => {
    expect(() => parseDue("2/30/2027")).toThrow(/invalid date/);
    expect(() => parseDue("2027-02-29")).toThrow(/invalid date/);
    expect(() => parseDue("31-Foo-2027")).toThrow(/month/);
    expect(() => parseDue("next week")).toThrow(/unrecognised date/);
    expect(() => parseDue("11/9/26")).toThrow();
  });
});

describe("priority / status / owner mapping", () => {
  it("maps priorities", () => {
    expect(parsePriority("High")).toBe("high");
    expect(parsePriority("h")).toBe("high");
    expect(parsePriority("M")).toBe("medium");
    expect(parsePriority("")).toBe("medium");
    expect(parsePriority("low")).toBe("low");
    expect(parsePriority("L")).toBe("low");
    expect(() => parsePriority("urgent")).toThrow(/priority/);
  });

  it("maps statuses", () => {
    for (const s of ["done", "Complete", "YES", "x", "X"]) expect(parseStatus(s)).toBe("done");
    for (const s of ["", "open", "Open", "todo"]) expect(parseStatus(s)).toBe("open");
    expect(() => parseStatus("maybe")).toThrow(/status/);
  });

  it("maps owners case-insensitively; blank/both = null", () => {
    expect(parseOwner("alex", members)).toBe("u1");
    expect(parseOwner(" SAM ", members)).toBe("u2");
    expect(parseOwner("", members)).toBeNull();
    expect(parseOwner("Both", members)).toBeNull();
    expect(() => parseOwner("Pat", members)).toThrow(/unknown owner/);
  });
});

describe("mapHeader", () => {
  it("is case/space-insensitive and knows link/url and next step", () => {
    expect(mapHeader(["Workstream", "TASK", "Due", "Next Step", "URL", "random"])).toEqual({
      workstream: 0,
      task: 1,
      due: 2,
      nextStep: 3,
      link: 4,
    });
    expect(mapHeader(["next_step", "Link"])).toEqual({ nextStep: 0, link: 1 });
  });
});

describe("planImport", () => {
  const csv = [
    "Workstream,Task,Due,Priority,Status,Owner,Next step,Notes,Link",
    'EB5,File I-526,2026-12-01,high,,Alex,,"Ask lawyer, then file",https://example.com/i526',
    "eb5 ,Pay fee,12/15/2026,m,done,,,,",
    "EB5,,,high,,both,Wait for receipt,General EB5 notes,https://example.com/eb5",
    "Car insurance,Renew policy,5-Jan-2027,l,,sam,,,",
    "Office,,,,,,Find a desk,,",
    "Office,Bad date,31/31/2027,,,,,,",
    ",orphan task,,,,,,,",
    "Office,Bad owner,,,,Pat,,,",
    "Office,Bad link,,,,,,,ftp://x",
    ",,,,,,,,",
  ].join("\n");

  it("groups by workstream title case-insensitively and maps every column", () => {
    const plan = planImport(parseCsv(csv), members, [{ id: "existing-office", title: "OFFICE" }]);
    expect(plan.workstreams.map((w) => [w.title, w.existingId])).toEqual([
      ["EB5", null],
      ["Car insurance", null],
      ["Office", "existing-office"],
    ]);
    const eb5 = plan.workstreams[0];
    expect(eb5.tasks).toEqual([
      {
        row: 2,
        title: "File I-526",
        notes: "Ask lawyer, then file",
        dueDate: "2026-12-01",
        priority: "high",
        status: "open",
        assigneeId: "u1",
        links: ["https://example.com/i526"],
      },
      { row: 3, title: "Pay fee", notes: null, dueDate: "2026-12-15", priority: "medium", status: "done", assigneeId: null, links: [] },
    ]);
    // A task-less row sets workstream fields
    expect(eb5.nextStep).toBe("Wait for receipt");
    expect(eb5.notes).toEqual(["General EB5 notes"]);
    expect(eb5.links).toEqual(["https://example.com/eb5"]);
    expect(eb5.priority).toBe("high");
    expect(eb5.ownerId).toBeNull();
    expect(plan.workstreams[1].tasks[0]).toMatchObject({ dueDate: "2027-01-05", priority: "low", assigneeId: "u2" });
    expect(plan.workstreams[2].nextStep).toBe("Find a desk");
  });

  it("reports bad rows (header = row 1) and still counts the good ones", () => {
    const plan = planImport(parseCsv(csv), members, [{ id: "existing-office", title: "OFFICE" }]);
    expect(plan.errors.map((e) => e.row)).toEqual([7, 8, 9, 10]);
    expect(plan.errors[0].message).toMatch(/date/);
    expect(plan.errors[1].message).toMatch(/workstream is required/);
    expect(plan.errors[2].message).toMatch(/owner/);
    expect(plan.errors[3].message).toMatch(/http/);
    expect(plan.counts).toEqual({ workstreamsCreated: 2, tasksCreated: 3, linksCreated: 2 });
  });

  it("requires a workstream column and caps rows at 2,000", () => {
    expect(() => planImport(parseCsv("task,due\nx,"), members, [])).toThrow(ImportError);
    const big = ["workstream,task", ...Array.from({ length: 2001 }, (_, i) => `W,t${i}`)].join("\n");
    expect(() => planImport(parseCsv(big), members, [])).toThrow(/2000/);
    const ok = ["workstream,task", ...Array.from({ length: 2000 }, (_, i) => `W,t${i}`)].join("\n");
    expect(planImport(parseCsv(ok), members, []).counts.tasksCreated).toBe(2000);
  });

  it("throws on an empty CSV", () => {
    expect(() => planImport([], members, [])).toThrow(ImportError);
  });
});
