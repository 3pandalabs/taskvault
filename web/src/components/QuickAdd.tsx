"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { createTask, errorMessage, listWorkstreams } from "@/lib/api";
import { useAction, useAsync } from "@/lib/hooks";
import { notifyChanged, toast } from "@/lib/toast";
import type { Priority } from "@/lib/types";
import { MemberSelect, PrioritySelect } from "./bits";
import { ErrorText, Field, Modal, Spinner } from "./common";
import { Button } from "./ui/button";
import { Input, Select } from "./ui/input";

const LAST_KEY = "lo_quickadd_workstream";

function readLast() {
  try {
    return window.localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

/** Add a task to any workstream from anywhere (the floating + button). */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Add a task">
      {open ? <QuickAddForm onClose={onClose} /> : null}
    </Modal>
  );
}

function QuickAddForm({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const fromPath = /^\/workstreams\/([^/]+)/.exec(pathname)?.[1] ?? null;
  const ws = useAsync(() => listWorkstreams(), "quickadd-ws");
  const [picked, setPicked] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assignee, setAssignee] = useState<string | null>(null);
  const save = useAction();

  const list = ws.data ?? [];
  const preferred = fromPath ?? readLast();
  const workstreamId = picked ?? (list.find((w) => w.id === preferred)?.id || list[0]?.id || "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return save.setError("What needs doing?");
    if (!workstreamId) return save.setError("Pick a workstream.");
    const ok = await save.run(
      () =>
        createTask(workstreamId, {
          title: title.trim(),
          dueDate: due || null,
          priority,
          assigneeId: assignee,
        }),
      errorMessage,
    );
    if (ok) {
      try {
        window.localStorage.setItem(LAST_KEY, workstreamId);
      } catch {
        /* convenience only */
      }
      toast("Task added");
      notifyChanged();
      onClose();
    }
  }

  if (ws.data && !list.length) {
    return (
      <div className="space-y-3 text-sm text-fg-muted">
        <p>Tasks live inside a workstream (like &ldquo;Car insurance&rdquo;). Create one first.</p>
        <Link href="/workstreams?new=1" onClick={onClose} className="font-medium text-amber-300 hover:underline">
          Create a workstream
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Task" htmlFor="qa-title">
        <Input
          id="qa-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Renew car insurance"
          maxLength={300}
          autoComplete="off"
        />
      </Field>
      <Field label="Workstream" htmlFor="qa-ws">
        <Select
          id="qa-ws"
          value={workstreamId}
          onChange={(e) => setPicked(e.target.value)}
          disabled={!ws.data}
        >
          {!ws.data ? <option value="">{ws.error ? "Couldn't load workstreams" : "Loading…"}</option> : null}
          {list.map((w) => (
            <option key={w.id} value={w.id}>
              {w.title}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
        <Field label="Due date (optional)" htmlFor="qa-due">
          <Input id="qa-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Priority" htmlFor="qa-priority">
          <PrioritySelect id="qa-priority" value={priority} onChange={setPriority} />
        </Field>
      </div>
      <Field label="Assignee" htmlFor="qa-assignee">
        <MemberSelect id="qa-assignee" value={assignee} onChange={setAssignee} />
      </Field>
      <ErrorText>{save.error || (ws.error ? errorMessage(ws.error) : null)}</ErrorText>
      <div className="flex justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={save.busy || !ws.data}>
          {save.busy ? <Spinner /> : null}
          Add task
        </Button>
      </div>
    </form>
  );
}
