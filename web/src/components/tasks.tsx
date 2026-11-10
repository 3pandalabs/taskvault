"use client";

import { Check, ExternalLink, Paperclip, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { deleteTask, errorMessage, updateTask } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { toast } from "@/lib/toast";
import type { ISODate, Link as DocLink, Priority, Task, TaskPatch } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar, DueLabel, LinkIcon, linkInfo, MemberSelect, PriorityDot, PrioritySelect } from "./bits";
import { ErrorText, Field, Modal, Spinner } from "./common";
import { Button } from "./ui/button";
import { Input, Textarea } from "./ui/input";

/**
 * Optimistic done/undone. The row flips immediately; on failure it flips back
 * and a toast explains. `onSaved` receives the server's Task.
 */
export function useTaskToggle(onSaved: (t: Task) => void) {
  const [overrides, setOverrides] = useState<Record<string, Task["status"]>>({});
  const statusOf = useCallback((t: Task) => overrides[t.id] ?? t.status, [overrides]);
  const toggle = useCallback(
    async (t: Task) => {
      const next = (overrides[t.id] ?? t.status) === "done" ? "open" : "done";
      setOverrides((o) => ({ ...o, [t.id]: next }));
      try {
        const saved = await updateTask(t.id, { status: next });
        onSaved(saved);
        setOverrides((o) => {
          const rest = { ...o };
          delete rest[t.id];
          return rest;
        });
      } catch (e) {
        setOverrides((o) => {
          const rest = { ...o };
          delete rest[t.id];
          return rest;
        });
        toast(`Couldn't update "${t.title}". ${errorMessage(e)}`, "error");
      }
    },
    [overrides, onSaved],
  );
  return { statusOf, toggle };
}

export function TaskCheckbox({ done, onToggle, title }: { done: boolean; onToggle: () => void; title: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
      onClick={onToggle}
      className="group -m-1.5 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-amber-400 bg-amber-400 text-zinc-950" : "border-zinc-500 group-hover:border-amber-400",
        )}
      >
        {done ? <Check className="size-4" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function TaskRow({
  task,
  status,
  today,
  onToggle,
  onOpen,
  showWorkstream,
  linkCount = 0,
}: {
  task: Task;
  status: Task["status"];
  today: ISODate;
  onToggle: () => void;
  onOpen: () => void;
  showWorkstream?: boolean;
  linkCount?: number;
}) {
  const done = status === "done";
  const meta =
    (task.dueDate && !done) || showWorkstream || task.notes || linkCount ? (
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pb-1">
        {task.dueDate && !done ? <DueLabel due={task.dueDate} today={today} /> : null}
        {showWorkstream ? (
          <Link
            href={`/workstreams/${task.workstreamId}`}
            className="inline-flex min-h-7 max-w-[12rem] items-center truncate rounded-full border border-white/10 bg-white/5 px-2.5 text-xs text-zinc-400 hover:text-zinc-100"
            title={`Open ${task.workstreamTitle}`}
          >
            <span className="truncate">{task.workstreamTitle}</span>
          </Link>
        ) : null}
        {linkCount ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-fg-muted" title={`${linkCount} linked doc(s)`}>
            <Paperclip className="size-3" aria-hidden />
            {linkCount}
          </span>
        ) : null}
        {task.notes && !showWorkstream ? (
          <span className="min-w-0 max-w-full truncate text-xs text-fg-muted">{task.notes.split("\n")[0]}</span>
        ) : null}
      </div>
    ) : null;
  return (
    <li className="flex items-start gap-2 px-3 py-1 sm:px-4">
      <div className="pt-0.5">
        <TaskCheckbox done={done} onToggle={onToggle} title={task.title} />
      </div>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-11 w-full items-center rounded-lg py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span className={cn("text-[15px] leading-snug text-fg", done && "text-fg-muted line-through")}>{task.title}</span>
        </button>
        {meta}
      </div>
      <div className="flex h-11 items-center gap-2 pt-0.5">
        <PriorityDot priority={task.priority} />
        <Avatar memberId={task.assigneeId} />
      </div>
    </li>
  );
}

/** Edit sheet for one task: title, notes, due, priority, assignee, done, delete. */
export function TaskSheet({
  task,
  links = [],
  onClose,
  onSaved,
  onDeleted,
  showWorkstreamLink,
}: {
  task: Task | null;
  links?: DocLink[];
  onClose: () => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
  showWorkstreamLink?: boolean;
}) {
  return (
    <Modal open={!!task} onClose={onClose} title="Edit task">
      {task ? (
        <TaskForm
          key={task.id}
          task={task}
          links={links}
          onClose={onClose}
          onSaved={onSaved}
          onDeleted={onDeleted}
          showWorkstreamLink={showWorkstreamLink}
        />
      ) : null}
    </Modal>
  );
}

function TaskForm({
  task,
  links,
  onClose,
  onSaved,
  onDeleted,
  showWorkstreamLink,
}: {
  task: Task;
  links: DocLink[];
  onClose: () => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
  showWorkstreamLink?: boolean;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [due, setDue] = useState(task.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assignee, setAssignee] = useState<string | null>(task.assigneeId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useAction();
  const del = useAction();
  const mine = links.filter((l) => l.taskId === task.id);

  async function submit(e?: React.FormEvent, statusOverride?: Task["status"]) {
    e?.preventDefault();
    const t = title.trim();
    if (!t) {
      save.setError("Give the task a title.");
      return;
    }
    const patch: TaskPatch = {};
    if (t !== task.title) patch.title = t;
    const n = notes.trim() ? notes : null;
    if (n !== task.notes) patch.notes = n;
    const d = due || null;
    if (d !== task.dueDate) patch.dueDate = d;
    if (priority !== task.priority) patch.priority = priority;
    if (assignee !== task.assigneeId) patch.assigneeId = assignee;
    if (statusOverride && statusOverride !== task.status) patch.status = statusOverride;
    if (!Object.keys(patch).length) return onClose();
    await save.run(async () => {
      onSaved(await updateTask(task.id, patch));
      onClose();
    }, errorMessage);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {showWorkstreamLink ? (
        <Link href={`/workstreams/${task.workstreamId}`} className="inline-flex items-center gap-1 text-sm text-amber-300 hover:underline">
          {task.workstreamTitle}
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      ) : null}
      <Field label="Title" htmlFor="task-title">
        <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} />
      </Field>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Field label="Due date" htmlFor="task-due">
          <div className="flex gap-1">
            <Input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            {due ? (
              <Button variant="ghost" size="sm" className="h-11 shrink-0" onClick={() => setDue("")}>
                Clear
              </Button>
            ) : null}
          </div>
        </Field>
        <Field label="Priority" htmlFor="task-priority">
          <PrioritySelect id="task-priority" value={priority} onChange={setPriority} />
        </Field>
      </div>
      <Field label="Assignee" htmlFor="task-assignee">
        <MemberSelect id="task-assignee" value={assignee} onChange={setAssignee} />
      </Field>
      <Field label="Notes" htmlFor="task-notes">
        <Textarea id="task-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
      </Field>
      {mine.length ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">Docs for this task</p>
          <ul className="space-y-1">
            {mine.map((l) => {
              const info = linkInfo(l.url);
              return (
                <li key={l.id}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm hover:bg-white/10"
                  >
                    <LinkIcon kind={info.kind} />
                    <span className="truncate">{l.title || info.host}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <ErrorText>{save.error || del.error}</ErrorText>

      {confirmDelete ? (
        <div className="space-y-3 rounded-xl border border-red-400/30 bg-red-400/10 p-3">
          <p className="text-sm text-fg">Delete this task? This can&apos;t be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={del.busy}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={del.busy}
              onClick={() =>
                del.run(async () => {
                  await deleteTask(task.id);
                  onDeleted(task.id);
                  onClose();
                }, errorMessage)
              }
            >
              {del.busy ? <Spinner /> : null}
              Delete task
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button variant="destructive-ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={save.busy}
              onClick={() => submit(undefined, task.status === "done" ? "open" : "done")}
            >
              {task.status === "done" ? "Reopen" : "Mark done"}
            </Button>
            <Button type="submit" disabled={save.busy}>
              {save.busy ? <Spinner /> : null}
              Save
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
