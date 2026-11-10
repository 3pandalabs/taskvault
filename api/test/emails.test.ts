import { describe, expect, it } from "vitest";
import { digestIsEmpty, digestMail, digestSubject, passwordResetMail, reminderMail } from "../src/lib/emails.js";

const WEB = "https://taskvault.example";

describe("reminderMail", () => {
  it("builds the subject per stage and links to the workstream", () => {
    const base = { to: "a@example.com", taskTitle: "Renew <policy>", workstreamId: "w1", workstreamTitle: "Car", dueDate: "2026-11-16", notes: null };
    expect(reminderMail(WEB, { ...base, stage: "7" }).subject).toBe("Due in 7 days: Renew <policy> — Car");
    expect(reminderMail(WEB, { ...base, stage: "1" }).subject).toBe("Due tomorrow: Renew <policy> — Car");
    expect(reminderMail(WEB, { ...base, stage: "0" }).subject).toBe("Due today: Renew <policy> — Car");
    expect(reminderMail(WEB, { ...base, stage: "overdue" }).subject).toBe("Overdue: Renew <policy> — Car");
    const m = reminderMail(WEB, { ...base, stage: "7" });
    expect(m.html).toContain(`${WEB}/workstreams/w1`);
    expect(m.text).toContain(`${WEB}/workstreams/w1`);
    // HTML-escaped
    expect(m.html).toContain("Renew &lt;policy&gt;");
    expect(m.html).not.toContain("<policy>");
  });
});

describe("digest", () => {
  const task = (title: string) => ({ title, workstreamId: "w1", workstreamTitle: "EB5", dueDate: "2026-11-09", priority: "high" as const });
  const content = {
    overdue: [task("a"), task("b")],
    dueToday: [task("c")],
    thisWeek: [task("d"), task("e"), task("f")],
    nextSteps: [{ workstreamId: "w2", title: "Office", priority: "low" as const, status: "active" as const, nextStep: "call" }],
  };

  it("summarises counts in the subject", () => {
    expect(digestSubject(content)).toBe("Today: 2 overdue, 1 due today, 3 this week");
    expect(digestSubject({ ...content, overdue: [], thisWeek: [] })).toBe("Today: 1 due today");
    expect(digestSubject({ overdue: [], dueToday: [], thisWeek: [], nextSteps: content.nextSteps })).toBe("Today: 1 next step");
  });

  it("is empty only when all four lists are empty", () => {
    expect(digestIsEmpty({ overdue: [], dueToday: [], thisWeek: [], nextSteps: [] })).toBe(true);
    expect(digestIsEmpty(content)).toBe(false);
  });

  it("renders every section with workstream links", () => {
    const m = digestMail(WEB, "a@example.com", "A", "2026-11-09", content);
    for (const s of ["Overdue", "Due today", "Next 7 days", "Next steps"]) expect(m.html).toContain(s);
    expect(m.html).toContain(`${WEB}/workstreams/w2`);
    expect(m.text).toContain("NEXT STEPS");
  });
});

describe("passwordResetMail", () => {
  it("puts the link in both parts", () => {
    const m = passwordResetMail("a@example.com", `${WEB}/reset-password?token=abc`);
    expect(m.text).toContain("reset-password?token=abc");
    expect(m.html).toContain("reset-password?token=abc");
    expect(m.subject).toBe("Reset your TaskVault password");
  });
});
