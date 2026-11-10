// Email templates (HTML + text). Pure: no env/db imports; the web URL is a
// parameter. lib/mailer.ts sends what these return.
import type { ReminderStage } from "./reminders.js";
import type { NextStepItem, Priority } from "./types.js";

export type Mail = { to: string; subject: string; html: string; text: string };

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const BUTTON = "background:#1d4ed8;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block;";

function wrap(inner: string): string {
  return `<div style="font-family:${FONT};color:#1f2937;max-width:560px;font-size:15px;line-height:1.6;">
${inner}
<p style="font-size:12px;color:#9ca3af;margin-top:28px;">TaskVault by 3PandaLabs. Turn off the daily digest in Settings.</p>
</div>`;
}

const workstreamUrl = (webUrl: string, id: string) => `${webUrl}/workstreams/${id}`;

// ------------------------------------------------------------- reminder --

export function reminderSubjectPrefix(stage: ReminderStage): string {
  switch (stage) {
    case "7":
      return "Due in 7 days";
    case "1":
      return "Due tomorrow";
    case "0":
      return "Due today";
    case "overdue":
      return "Overdue";
  }
}

export type ReminderInput = {
  to: string;
  stage: ReminderStage;
  taskTitle: string;
  workstreamId: string;
  workstreamTitle: string;
  dueDate: string;
  notes: string | null;
};

export function reminderMail(webUrl: string, r: ReminderInput): Mail {
  const prefix = reminderSubjectPrefix(r.stage);
  const url = workstreamUrl(webUrl, r.workstreamId);
  const subject = `${prefix}: ${r.taskTitle} — ${r.workstreamTitle}`;
  const text = [
    `${prefix}: ${r.taskTitle}`,
    `Workstream: ${r.workstreamTitle}`,
    `Due: ${r.dueDate}`,
    ...(r.notes ? ["", r.notes] : []),
    "",
    `Open: ${url}`,
  ].join("\n");
  const html = wrap(`<p style="margin:0 0 4px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">${esc(prefix)}</p>
<h2 style="margin:0 0 8px;font-size:20px;">${esc(r.taskTitle)}</h2>
<p style="margin:0 0 16px;color:#4b5563;">${esc(r.workstreamTitle)} &middot; due ${esc(r.dueDate)}</p>
${r.notes ? `<p style="white-space:pre-wrap;background:#f9fafb;border-radius:8px;padding:12px;">${esc(r.notes)}</p>` : ""}
<p style="margin:20px 0;"><a href="${esc(url)}" style="${BUTTON}">Open workstream</a></p>
<p style="font-size:12px;color:#6b7280;word-break:break-all;">${esc(url)}</p>`);
  return { to: r.to, subject, html, text };
}

// --------------------------------------------------------------- digest --

export type DigestTask = { title: string; workstreamId: string; workstreamTitle: string; dueDate: string | null; priority: Priority };

export type DigestContent = {
  overdue: DigestTask[];
  dueToday: DigestTask[];
  thisWeek: DigestTask[];
  nextSteps: NextStepItem[];
};

export function digestIsEmpty(d: DigestContent): boolean {
  return d.overdue.length + d.dueToday.length + d.thisWeek.length + d.nextSteps.length === 0;
}

/** "Today: 2 overdue, 1 due today, 3 this week" (zero parts dropped). */
export function digestSubject(d: DigestContent): string {
  const parts = [
    d.overdue.length ? `${d.overdue.length} overdue` : "",
    d.dueToday.length ? `${d.dueToday.length} due today` : "",
    d.thisWeek.length ? `${d.thisWeek.length} this week` : "",
  ].filter(Boolean);
  if (parts.length) return `Today: ${parts.join(", ")}`;
  return `Today: ${d.nextSteps.length} next step${d.nextSteps.length === 1 ? "" : "s"}`;
}

export function digestMail(webUrl: string, to: string, name: string, date: string, d: DigestContent): Mail {
  const section = (title: string, items: DigestTask[], color: string) => {
    if (!items.length) return { html: "", text: "" };
    const text = [`${title.toUpperCase()}`, ...items.map((t) => `- ${t.title} (${t.workstreamTitle})${t.dueDate ? `, due ${t.dueDate}` : ""}`), ""].join("\n");
    const html = `<h3 style="margin:20px 0 6px;font-size:15px;color:${color};">${esc(title)} (${items.length})</h3>
<ul style="margin:0;padding-left:20px;">${items
      .map(
        (t) =>
          `<li style="margin:4px 0;"><a href="${esc(workstreamUrl(webUrl, t.workstreamId))}" style="color:#1f2937;">${esc(t.title)}</a> <span style="color:#6b7280;">&middot; ${esc(t.workstreamTitle)}${t.dueDate ? ` &middot; ${esc(t.dueDate)}` : ""}</span></li>`,
      )
      .join("")}</ul>`;
    return { html, text };
  };
  const overdue = section("Overdue", d.overdue, "#b91c1c");
  const today = section("Due today", d.dueToday, "#b45309");
  const week = section("Next 7 days", d.thisWeek, "#1d4ed8");
  const steps = d.nextSteps.length
    ? {
        text: ["NEXT STEPS", ...d.nextSteps.map((s) => `- ${s.title}: ${s.nextStep}`), ""].join("\n"),
        html: `<h3 style="margin:20px 0 6px;font-size:15px;color:#047857;">Next steps (${d.nextSteps.length})</h3>
<ul style="margin:0;padding-left:20px;">${d.nextSteps
          .map((s) => `<li style="margin:4px 0;"><a href="${esc(workstreamUrl(webUrl, s.workstreamId))}" style="color:#1f2937;font-weight:600;">${esc(s.title)}</a>: ${esc(s.nextStep)}</li>`)
          .join("")}</ul>`,
      }
    : { html: "", text: "" };

  const subject = digestSubject(d);
  const text = [`Good morning ${name}, here's ${date}.`, "", overdue.text, today.text, week.text, steps.text, `Open TaskVault: ${webUrl}/today`]
    .filter((s) => s !== "")
    .join("\n");
  const html = wrap(`<p style="margin:0 0 4px;">Good morning ${esc(name)}, here's <strong>${esc(date)}</strong>.</p>
${overdue.html}${today.html}${week.html}${steps.html}
<p style="margin:24px 0;"><a href="${esc(`${webUrl}/today`)}" style="${BUTTON}">Open Today</a></p>`);
  return { to, subject, html, text };
}

// -------------------------------------------------------- password reset --

export function passwordResetMail(to: string, url: string): Mail {
  const subject = "Reset your TaskVault password";
  const text = `Someone asked to reset the password for this TaskVault account. The link works once and expires in 1 hour.\n\nChoose a new password:\n${url}\n\nIf this wasn't you, ignore this email. Your password stays the same.`;
  const html = wrap(`<p>Someone asked to reset the password for this TaskVault account. The link works once and expires in 1 hour.</p>
<p style="margin:24px 0;"><a href="${esc(url)}" style="${BUTTON}">Choose a new password</a></p>
<p style="font-size:13px;color:#6b7280;">Button not working? Copy this link into your browser:<br><span style="word-break:break-all;">${esc(url)}</span></p>
<p style="font-size:13px;color:#6b7280;">If this wasn't you, ignore this email. Your password stays the same.</p>`);
  return { to, subject, html, text };
}
