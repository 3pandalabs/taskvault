"use client";

import { ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PriorityDot, StatusBadge } from "@/components/bits";
import { EmptyState, LoadError, Loading, Panel, SectionTitle } from "@/components/common";
import { TaskRow, TaskSheet, useTaskToggle } from "@/components/tasks";
import { getToday } from "@/lib/api";
import { formatDate } from "@/lib/dates";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { onChanged } from "@/lib/toast";
import type { ISODate, Task, Today } from "@/lib/types";

function greeting(tz: string) {
  let h = new Date().getHours();
  try {
    h = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  } catch {
    /* browser hour */
  }
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function TodayPage() {
  const { user } = useSession();
  const today = useAsync(getToday, "today");
  const { reload, mutate, data } = today;
  const [editing, setEditing] = useState<Task | null>(null);

  useEffect(() => onChanged(reload), [reload]);

  // Replace a task in whichever list holds it (keeps done rows in place, struck through).
  const patchTask = useCallback(
    (t: Task) => {
      const map = (xs: Task[]) => xs.map((x) => (x.id === t.id ? t : x));
      mutate((d) => ({ ...d, overdue: map(d.overdue), dueToday: map(d.dueToday), thisWeek: map(d.thisWeek) }));
    },
    [mutate],
  );
  const { statusOf, toggle } = useTaskToggle(patchTask);

  if (today.error && !data) return <LoadError error={today.error} onRetry={reload} />;

  const firstName = user.name.split(" ")[0];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-fg-muted">
          {data ? formatDate(data.date, { weekday: "long", month: "long", day: "numeric" }) : " "}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting(user.timezone)}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </header>

      {!data ? <Loading rows={5} /> : <TodayBody data={data} statusOf={statusOf} toggle={toggle} onOpen={setEditing} />}

      <TaskSheet
        task={editing}
        showWorkstreamLink
        onClose={() => setEditing(null)}
        onSaved={() => reload()}
        onDeleted={() => reload()}
      />
    </div>
  );
}

function TodayBody({
  data,
  statusOf,
  toggle,
  onOpen,
}: {
  data: Today;
  statusOf: (t: Task) => Task["status"];
  toggle: (t: Task) => void;
  onOpen: (t: Task) => void;
}) {
  const empty = !data.overdue.length && !data.dueToday.length && !data.thisWeek.length && !data.nextSteps.length;
  if (empty) {
    return (
      <EmptyState icon={<PartyPopper className="size-10" />} title="All clear">
        <p>Nothing overdue, nothing due this week, and no next steps waiting. Enjoy it.</p>
        <p className="mt-3">
          <Link href="/workstreams" className="font-medium text-amber-300 hover:underline">
            Browse workstreams
          </Link>{" "}
          or{" "}
          <Link href="/import" className="font-medium text-amber-300 hover:underline">
            import your spreadsheet
          </Link>
          .
        </p>
      </EmptyState>
    );
  }

  const nothingDue = !data.overdue.length && !data.dueToday.length && !data.thisWeek.length;
  return (
    <div className="space-y-6">
      {data.overdue.length ? (
        <TaskSection title="Overdue" tone="danger" tasks={data.overdue} today={data.date} {...{ statusOf, toggle, onOpen }} />
      ) : null}
      {data.dueToday.length ? (
        <TaskSection title="Due today" tasks={data.dueToday} today={data.date} {...{ statusOf, toggle, onOpen }} />
      ) : null}
      {data.thisWeek.length ? (
        <TaskSection title="This week" tasks={data.thisWeek} today={data.date} {...{ statusOf, toggle, onOpen }} />
      ) : null}
      {nothingDue ? (
        <Panel className="text-sm text-fg-muted">Nothing due in the next 7 days. 🎉</Panel>
      ) : null}

      {data.nextSteps.length ? (
        <section>
          <SectionTitle count={data.nextSteps.length}>Next steps</SectionTitle>
          <Panel className="p-0 sm:p-0">
            <ul className="divide-y divide-line">
              {data.nextSteps.map((n) => (
                <li key={n.workstreamId}>
                  <Link
                    href={`/workstreams/${n.workstreamId}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
                  >
                    <PriorityDot priority={n.priority} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-fg">{n.title}</span>
                        {n.status === "waiting" ? <StatusBadge status="waiting" /> : null}
                      </span>
                      <span className="mt-0.5 block text-sm text-fg-muted">{n.nextStep}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-fg-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      ) : null}
    </div>
  );
}

function TaskSection({
  title,
  tone,
  tasks,
  today,
  statusOf,
  toggle,
  onOpen,
}: {
  title: string;
  tone?: "danger";
  tasks: Task[];
  today: ISODate;
  statusOf: (t: Task) => Task["status"];
  toggle: (t: Task) => void;
  onOpen: (t: Task) => void;
}) {
  const open = tasks.filter((t) => statusOf(t) === "open").length;
  return (
    <section>
      <SectionTitle tone={tone} count={open}>
        {title}
      </SectionTitle>
      <Panel className={tone === "danger" ? "border-red-400/30 p-0 sm:p-0" : "p-0 sm:p-0"}>
        <ul className="divide-y divide-line py-1">
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              status={statusOf(t)}
              today={today}
              showWorkstream
              onToggle={() => toggle(t)}
              onOpen={() => onOpen(t)}
            />
          ))}
        </ul>
      </Panel>
    </section>
  );
}
