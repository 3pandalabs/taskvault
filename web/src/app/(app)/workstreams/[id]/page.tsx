"use client";

import { ArrowLeft, Check, ChevronDown, ExternalLink, Link2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LinkIcon, linkInfo, MemberSelect, PrioritySelect, STATUS_LABEL, STATUSES } from "@/components/bits";
import { ConfirmModal, ErrorText, Field, LoadError, Loading, Panel, SectionTitle, Spinner } from "@/components/common";
import { TaskRow, TaskSheet, useTaskToggle } from "@/components/tasks";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  ApiError,
  createLink,
  createTask,
  deleteLink,
  deleteWorkstream,
  errorMessage,
  getWorkstream,
  updateWorkstream,
} from "@/lib/api";
import { compareTasks, daysBetween, todayIn } from "@/lib/dates";
import { useAction, useAsync } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { notifyChanged, onChanged, toast } from "@/lib/toast";
import type { ISODate, Link as DocLink, Priority, Task, WorkstreamDetail, WorkstreamPatch } from "@/lib/types";
import { cn } from "@/lib/utils";

// Client-rendered dynamic route, same as BorrowVault's /listings/[id]: no
// generateStaticParams, the id comes from useParams and everything loads from
// the API in the browser.
export default function WorkstreamPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useAsync(() => getWorkstream(id), `workstream:${id}`);
  const { data, mutate, reload } = detail;
  useEffect(() => onChanged(reload), [reload]);

  if (detail.error && !data) {
    const missing = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink />
        <LoadError error={missing ? new Error("This workstream doesn't exist any more.") : detail.error} onRetry={missing ? undefined : reload} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <BackLink />
        <Loading rows={6} />
      </div>
    );
  }
  return <Detail key={data.workstream.id} data={data} mutate={mutate} />;
}

function BackLink() {
  return (
    <Link href="/workstreams" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-fg-muted hover:text-fg">
      <ArrowLeft className="size-4" aria-hidden />
      Workstreams
    </Link>
  );
}

function Detail({
  data,
  mutate,
}: {
  data: WorkstreamDetail;
  mutate: (fn: (d: WorkstreamDetail) => WorkstreamDetail) => void;
}) {
  const { user } = useSession();
  const today = todayIn(user.timezone);
  const { workstream: ws, tasks, links } = data;

  const setTasks = useCallback(
    (fn: (t: Task[]) => Task[]) => mutate((d) => ({ ...d, tasks: fn(d.tasks).sort(compareTasks) })),
    [mutate],
  );
  const replaceTask = useCallback((t: Task) => setTasks((ts) => ts.map((x) => (x.id === t.id ? t : x))), [setTasks]);
  const mergeWorkstream = useCallback(
    (w: Partial<WorkstreamDetail["workstream"]>) => mutate((d) => ({ ...d, workstream: { ...d.workstream, ...w } })),
    [mutate],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackLink />
      <HeaderEditor data={data} onSaved={mergeWorkstream} />
      <TasksSection
        workstreamId={ws.id}
        tasks={tasks}
        links={links}
        today={today}
        onAdded={(t) => setTasks((ts) => [...ts, t])}
        onSaved={replaceTask}
        onDeleted={(id) => {
          setTasks((ts) => ts.filter((t) => t.id !== id));
          // ROUTES.md doesn't say what happens to a deleted task's links; refetch to show the truth.
          notifyChanged();
        }}
      />
      <LinksSection
        workstreamId={ws.id}
        links={links}
        tasks={tasks}
        onAdded={(l) => mutate((d) => ({ ...d, links: [...d.links, l] }))}
        onRemoved={(id) => mutate((d) => ({ ...d, links: d.links.filter((x) => x.id !== id) }))}
      />
      <NotesSection data={data} onSaved={mergeWorkstream} />
      <DangerZone id={ws.id} title={ws.title} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header: title, status, priority, owner, next step, description.

type SaveState = "idle" | "saving" | "saved" | "error";

function useFieldSaver(id: string, onSaved: (w: Partial<WorkstreamDetail["workstream"]>) => void) {
  const [state, setState] = useState<SaveState>("idle");
  const save = useCallback(
    async (patch: WorkstreamPatch) => {
      setState("saving");
      try {
        const w = await updateWorkstream(id, patch);
        onSaved(w);
        setState("saved");
        return true;
      } catch (e) {
        setState("error");
        toast(`Couldn't save. ${errorMessage(e)}`, "error");
        return false;
      }
    },
    [id, onSaved],
  );
  return { state, save };
}

function SaveIndicator({ state }: { state: SaveState }) {
  return (
    <span aria-live="polite" className="inline-flex h-5 items-center gap-1 text-xs text-fg-muted">
      {state === "saving" ? (
        <>
          <Spinner className="size-3" /> Saving…
        </>
      ) : state === "saved" ? (
        <>
          <Check className="size-3" /> Saved
        </>
      ) : state === "error" ? (
        <span className="text-danger">Not saved</span>
      ) : null}
    </span>
  );
}

function HeaderEditor({
  data,
  onSaved,
}: {
  data: WorkstreamDetail;
  onSaved: (w: Partial<WorkstreamDetail["workstream"]>) => void;
}) {
  const ws = data.workstream;
  const { state, save } = useFieldSaver(ws.id, onSaved);
  const [title, setTitle] = useState(ws.title);
  const [nextStep, setNextStep] = useState(ws.nextStep ?? "");
  const [description, setDescription] = useState(ws.description ?? "");

  const open = data.tasks.filter((t) => t.status === "open").length;
  const { user } = useSession();
  const today = todayIn(user.timezone);
  const overdue = data.tasks.filter((t) => t.status === "open" && t.dueDate && daysBetween(today, t.dueDate) < 0).length;

  return (
    <Panel className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <label htmlFor="ws-title" className="sr-only">
          Workstream name
        </label>
        <textarea
          id="ws-title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), e.currentTarget.blur())}
          onBlur={() => {
            const t = title.trim();
            if (!t) return setTitle(ws.title);
            if (t !== ws.title) save({ title: t });
          }}
          maxLength={200}
          className="field-sizing-content -mx-2 w-full resize-none rounded-lg bg-transparent px-2 py-1 text-2xl font-semibold leading-tight tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <SaveIndicator state={state} />
      </div>
      <p className="-mt-2 text-sm text-fg-muted">
        {open} open task{open === 1 ? "" : "s"}
        {overdue ? <span className="font-medium text-danger"> · {overdue} overdue</span> : null}
      </p>

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
        <Field label="Status" htmlFor="ws-status">
          <Select id="ws-status" value={ws.status} onChange={(e) => save({ status: e.target.value as typeof ws.status })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
                {s === "waiting" ? " (on someone else)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority" htmlFor="ws-priority">
          <PrioritySelect id="ws-priority" value={ws.priority} onChange={(p) => save({ priority: p })} />
        </Field>
        <Field label="Owner" htmlFor="ws-owner">
          <MemberSelect id="ws-owner" value={ws.ownerId} onChange={(o) => save({ ownerId: o })} />
        </Field>
      </div>

      <Field label="Next step" htmlFor="ws-next" hint="The one next thing to do. Shows on Today.">
        <Input
          id="ws-next"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onBlur={() => {
            const v = nextStep.trim() || null;
            if (v !== ws.nextStep) save({ nextStep: v });
          }}
          placeholder="e.g. Email the attorney about I-526E status"
          maxLength={500}
        />
      </Field>
      <Field label="Description" htmlFor="ws-desc">
        <Textarea
          id="ws-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => {
            const v = description.trim() ? description : null;
            if (v !== ws.description) save({ description: v });
          }}
          placeholder="What is this about?"
          className="min-h-[60px]"
        />
      </Field>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Tasks

function TasksSection({
  workstreamId,
  tasks,
  links,
  today,
  onAdded,
  onSaved,
  onDeleted,
}: {
  workstreamId: string;
  tasks: Task[];
  links: DocLink[];
  today: ISODate;
  onAdded: (t: Task) => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [showDone, setShowDone] = useState(false);
  const { statusOf, toggle } = useTaskToggle(onSaved);
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const linkCount = (id: string) => links.filter((l) => l.taskId === id).length;

  const row = (t: Task) => (
    <TaskRow
      key={t.id}
      task={t}
      status={statusOf(t)}
      today={today}
      linkCount={linkCount(t.id)}
      onToggle={() => toggle(t)}
      onOpen={() => setEditing(t)}
    />
  );

  return (
    <section>
      <SectionTitle count={open.length}>Tasks</SectionTitle>
      <Panel className="p-0 sm:p-0">
        <QuickAddTask workstreamId={workstreamId} onAdded={onAdded} />
        {open.length ? (
          <ul className="divide-y divide-line border-t border-line py-1">{open.map(row)}</ul>
        ) : (
          <p className="border-t border-line px-4 py-6 text-center text-sm text-fg-muted">
            {done.length ? "Every task here is done. Nice." : "No tasks yet. Add the first one above."}
          </p>
        )}
        {done.length ? (
          <div className="border-t border-line">
            <button
              type="button"
              onClick={() => setShowDone((s) => !s)}
              aria-expanded={showDone}
              className="flex min-h-11 w-full items-center gap-2 px-4 text-sm text-fg-muted hover:text-fg"
            >
              <ChevronDown className={cn("size-4 transition-transform", showDone && "rotate-180")} aria-hidden />
              {showDone ? "Hide" : "Show"} {done.length} done
            </button>
            {showDone ? <ul className="divide-y divide-line pb-1">{done.map(row)}</ul> : null}
          </div>
        ) : null}
      </Panel>
      <TaskSheet
        task={editing}
        links={links}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
        onDeleted={onDeleted}
      />
    </section>
  );
}

function QuickAddTask({ workstreamId, onAdded }: { workstreamId: string; onAdded: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [more, setMore] = useState(false);
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState<string | null>(null);
  const { busy, error, setError, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const ok = await run(async () => {
      onAdded(await createTask(workstreamId, { title: t, dueDate: due || null, priority, assigneeId: assignee }));
    }, errorMessage);
    if (ok) {
      setTitle("");
      setDue("");
      setError(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 p-3 sm:p-4">
      <div className="flex gap-2">
        <label htmlFor="add-task" className="sr-only">
          New task
        </label>
        <Input
          id="add-task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task…"
          maxLength={300}
          autoComplete="off"
        />
        <Button
          variant={more ? "outline" : "ghost"}
          size="icon"
          className="shrink-0"
          onClick={() => setMore((m) => !m)}
          aria-expanded={more}
          aria-label="Due date, priority and assignee"
        >
          <SlidersHorizontal />
        </Button>
        <Button type="submit" size="icon" className="shrink-0" disabled={busy || !title.trim()} aria-label="Add task">
          {busy ? <Spinner /> : <Plus />}
        </Button>
      </div>
      {more ? (
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
          <div>
            <label htmlFor="add-due" className="mb-1 block text-xs text-fg-muted">
              Due
            </label>
            <Input id="add-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <label htmlFor="add-pri" className="mb-1 block text-xs text-fg-muted">
              Priority
            </label>
            <PrioritySelect id="add-pri" value={priority} onChange={setPriority} />
          </div>
          <div>
            <label htmlFor="add-who" className="mb-1 block text-xs text-fg-muted">
              Assignee
            </label>
            <MemberSelect id="add-who" value={assignee} onChange={setAssignee} />
          </div>
        </div>
      ) : null}
      <ErrorText>{error}</ErrorText>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Docs & links

function LinksSection({
  workstreamId,
  links,
  tasks,
  onAdded,
  onRemoved,
}: {
  workstreamId: string;
  links: DocLink[];
  tasks: Task[];
  onAdded: (l: DocLink) => void;
  onRemoved: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [taskId, setTaskId] = useState("");
  const [removing, setRemoving] = useState<DocLink | null>(null);
  const add = useAction();
  const del = useAction();
  const taskTitle = (id: string | null) => (id ? tasks.find((t) => t.id === id)?.title : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    let u = url.trim();
    if (!u) return add.setError("Paste a link.");
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    try {
      new URL(u);
    } catch {
      return add.setError("That doesn't look like a web link.");
    }
    const ok = await add.run(async () => {
      const l = await createLink(workstreamId, {
        url: u,
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(taskId ? { taskId } : {}),
      });
      onAdded(l);
    }, errorMessage);
    if (ok) {
      setUrl("");
      setTitle("");
      setTaskId("");
      setAdding(false);
    }
  }

  return (
    <section>
      <SectionTitle
        count={links.length}
        action={
          !adding ? (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus />
              Add link
            </Button>
          ) : null
        }
      >
        Docs &amp; links
      </SectionTitle>
      <Panel className="p-0 sm:p-0">
        {adding ? (
          <form onSubmit={submit} className="space-y-3 border-b border-line p-3 sm:p-4">
            <Field label="Link" htmlFor="link-url" hint="Google Drive, Docs, Gmail threads, portals… anything with a URL.">
              <Input
                id="link-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://drive.google.com/…"
                autoComplete="off"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              <Field label="Title (optional)" htmlFor="link-title">
                <Input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </Field>
              <Field label="Attach to task (optional)" htmlFor="link-task">
                <Select id="link-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                  <option value="">Whole workstream</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <ErrorText>{add.error}</ErrorText>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  add.setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={add.busy}>
                {add.busy ? <Spinner /> : null}
                Save link
              </Button>
            </div>
          </form>
        ) : null}
        {links.length ? (
          <ul className="divide-y divide-line">
            {links.map((l) => {
              const info = linkInfo(l.url);
              const tt = taskTitle(l.taskId);
              return (
                <li key={l.id} className="flex items-center gap-1 pr-2">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 hover:bg-surface-2"
                  >
                    <LinkIcon kind={info.kind} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{l.title || info.host}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {info.host}
                        {tt ? ` · ${tt}` : ""}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-fg-muted" aria-hidden />
                  </a>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove link ${l.title || info.host}`}
                    onClick={() => {
                      del.setError(null);
                      setRemoving(l);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-14 w-full items-center justify-center gap-2 px-4 text-sm text-fg-muted hover:text-fg"
          >
            <Link2 className="size-4" aria-hidden />
            Link the passport scans, policy PDF or email thread here
          </button>
        ) : null}
      </Panel>
      <ConfirmModal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this link?"
        confirmLabel="Remove"
        busy={del.busy}
        error={del.error}
        onConfirm={() =>
          removing &&
          del.run(async () => {
            await deleteLink(removing.id);
            onRemoved(removing.id);
            setRemoving(null);
          }, errorMessage)
        }
      >
        <p>
          Only the link is removed from TaskVault. The document itself
          {removing ? ` (${linkInfo(removing.url).host})` : ""} isn&apos;t touched.
        </p>
      </ConfirmModal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Notes (autosave on blur)

function NotesSection({
  data,
  onSaved,
}: {
  data: WorkstreamDetail;
  onSaved: (w: Partial<WorkstreamDetail["workstream"]>) => void;
}) {
  const ws = data.workstream;
  const [notes, setNotes] = useState(ws.notes ?? "");
  const { state, save } = useFieldSaver(ws.id, onSaved);
  return (
    <section>
      <SectionTitle action={<SaveIndicator state={state} />}>Notes</SectionTitle>
      <label htmlFor="ws-notes" className="sr-only">
        Notes
      </label>
      <Textarea
        id="ws-notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => {
          const v = notes.trim() ? notes : null;
          if (v !== ws.notes) save({ notes: v });
        }}
        rows={6}
        placeholder="Case numbers, who you spoke to, what they said… Saves when you tap away."
        className="min-h-[140px] rounded-2xl"
      />
    </section>
  );
}

// ---------------------------------------------------------------------------

function DangerZone({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { busy, error, setError, run } = useAction();
  return (
    <div className="flex justify-center pt-2">
      <Button
        variant="destructive-ghost"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 />
        Delete workstream
      </Button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this workstream?"
        confirmLabel="Delete workstream"
        busy={busy}
        error={error}
        onConfirm={() =>
          run(async () => {
            await deleteWorkstream(id);
            toast(`Deleted "${title}"`);
            router.replace("/workstreams");
          }, errorMessage)
        }
      >
        <p>
          <strong className="text-fg">{title}</strong> and all of its tasks and links will be deleted for everyone in
          your household. This can&apos;t be undone.
        </p>
        <p>If it&apos;s just finished, set its status to Done instead.</p>
      </ConfirmModal>
    </div>
  );
}
