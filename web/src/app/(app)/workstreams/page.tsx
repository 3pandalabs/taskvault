"use client";

import { AlertTriangle, CalendarClock, FolderPlus, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Avatar, DueLabel, MemberSelect, PriorityBadge, PrioritySelect, StatusBadge } from "@/components/bits";
import { EmptyState, ErrorText, Field, LoadError, Loading, Modal, Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkstream, errorMessage, listWorkstreams } from "@/lib/api";
import { todayIn } from "@/lib/dates";
import { useAction, useAsync } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { onChanged } from "@/lib/toast";
import type { Priority, WorkstreamSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "open" | "done" | "all";
const TABS: { id: Tab; label: string }[] = [
  { id: "open", label: "Active + Waiting" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

const noop = () => () => undefined;

export default function WorkstreamsPage() {
  const [tab, setTab] = useState<Tab>("open");
  // `?new=1` (from the quick-add sheet) opens the create dialog.
  const wantsNew = useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("new") === "1",
    () => false,
  );
  const [creating, setCreating] = useState<boolean | null>(null);
  const showCreate = creating ?? wantsNew;
  const list = useAsync(() => listWorkstreams(tab === "open" ? undefined : tab), `ws:${tab}`);
  const { reload } = list;
  useEffect(() => onChanged(reload), [reload]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Workstreams</h1>
        <Button size="lg" onClick={() => setCreating(true)}>
          <Plus />
          New workstream
        </Button>
      </header>

      <div role="tablist" aria-label="Filter" className="flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-10 flex-1 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors",
              tab === t.id ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.error && !list.data ? (
        <LoadError error={list.error} onRetry={reload} />
      ) : !list.data ? (
        <Loading rows={4} />
      ) : list.data.length ? (
        <ul
          aria-busy={list.loading}
          className={cn("grid gap-3 transition-opacity sm:grid-cols-2", list.loading && "opacity-50")}
        >
          {list.data.map((w) => (
            <li key={w.id}>
              <WorkstreamCard w={w} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<FolderPlus className="size-10" />} title={tab === "done" ? "Nothing finished yet" : "No workstreams yet"}>
          {tab === "done" ? (
            <p>Workstreams you mark as done show up here.</p>
          ) : (
            <p>
              A workstream is one thing you&apos;re tracking, like &ldquo;EB5&rdquo; or &ldquo;Car insurance renewal&rdquo;.
              Create one, or{" "}
              <Link href="/import" className="font-medium text-accent hover:underline">
                import your spreadsheet
              </Link>
              .
            </p>
          )}
        </EmptyState>
      )}

      <p className="text-center text-sm md:hidden">
        <Link href="/import" className="inline-flex min-h-11 items-center gap-2 text-fg-muted hover:text-fg">
          <Upload className="size-4" aria-hidden />
          Import from a spreadsheet (CSV)
        </Link>
      </p>

      <NewWorkstreamDialog open={showCreate} onClose={() => setCreating(false)} />
    </div>
  );
}

function WorkstreamCard({ w }: { w: WorkstreamSummary }) {
  const { user, memberName } = useSession();
  const today = todayIn(user.timezone);
  return (
    <Link
      href={`/workstreams/${w.id}`}
      className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm transition-colors hover:border-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold leading-snug text-fg">{w.title}</h2>
        <StatusBadge status={w.status} />
      </div>
      {w.nextStep ? (
        <p className="text-sm text-fg">
          <span className="text-fg-muted">Next: </span>
          {w.nextStep}
        </p>
      ) : (
        <p className="text-sm italic text-fg-muted">No next step set</p>
      )}
      {w.nextDue ? (
        <p className="flex items-center gap-1.5 text-sm text-fg-muted">
          <CalendarClock className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{w.nextDue.title}</span>
          <span aria-hidden>·</span>
          <DueLabel due={w.nextDue.dueDate} today={today} className="text-sm" />
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <PriorityBadge priority={w.priority} />
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-muted">
          {w.openTasks} open
        </span>
        {w.overdueTasks ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
            <AlertTriangle className="size-3" aria-hidden />
            {w.overdueTasks} overdue
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1.5 text-xs text-fg-muted">
          {memberName(w.ownerId)}
          <Avatar memberId={w.ownerId} />
        </span>
      </div>
    </Link>
  );
}

function NewWorkstreamDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="New workstream">
      {open ? <NewWorkstreamForm onClose={onClose} /> : null}
    </Modal>
  );
}

function NewWorkstreamForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [owner, setOwner] = useState<string | null>(null);
  const [nextStep, setNextStep] = useState("");
  const { busy, error, setError, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give it a name, like “Car insurance renewal”.");
    await run(async () => {
      const w = await createWorkstream({
        title: title.trim(),
        priority,
        ownerId: owner,
        nextStep: nextStep.trim() || null,
      });
      router.push(`/workstreams/${w.id}`);
    }, errorMessage);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Name" htmlFor="nw-title">
        <Input
          id="nw-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Kids' OCI renewal"
          maxLength={200}
          autoComplete="off"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Field label="Priority" htmlFor="nw-priority">
          <PrioritySelect id="nw-priority" value={priority} onChange={setPriority} />
        </Field>
        <Field label="Owner" htmlFor="nw-owner">
          <MemberSelect id="nw-owner" value={owner} onChange={setOwner} />
        </Field>
      </div>
      <Field label="Next step (optional)" htmlFor="nw-next" hint="The one next thing to do.">
        <Input id="nw-next" value={nextStep} onChange={(e) => setNextStep(e.target.value)} maxLength={500} />
      </Field>
      <ErrorText>{error}</ErrorText>
      <div className="flex justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Spinner /> : null}
          Create
        </Button>
      </div>
    </form>
  );
}
