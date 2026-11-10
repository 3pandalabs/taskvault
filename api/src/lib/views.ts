// Row → API shape (ROUTES.md "Shapes"). Pure: types only from the schema.
import type { links, tasks, users, workstreams } from "../db/schema.js";
import type { LinkView, TaskView, UserView, WorkstreamView } from "./types.js";

type UserRow = typeof users.$inferSelect;
type WorkstreamRow = typeof workstreams.$inferSelect;
type TaskRow = typeof tasks.$inferSelect;
type LinkRow = typeof links.$inferSelect;

export function userView(u: UserRow): UserView {
  return { id: u.id, email: u.email, name: u.name, timezone: u.timezone, digestEnabled: u.digestEnabled };
}

export function workstreamView(w: WorkstreamRow): WorkstreamView {
  return {
    id: w.id,
    title: w.title,
    description: w.description,
    status: w.status,
    priority: w.priority,
    ownerId: w.ownerId,
    nextStep: w.nextStep,
    notes: w.notes,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export function taskView(t: TaskRow, workstreamTitle: string): TaskView {
  return {
    id: t.id,
    workstreamId: t.workstreamId,
    workstreamTitle,
    title: t.title,
    notes: t.notes,
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    assigneeId: t.assigneeId,
    doneAt: t.doneAt ? t.doneAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function linkView(l: LinkRow): LinkView {
  return { id: l.id, workstreamId: l.workstreamId, taskId: l.taskId, title: l.title, url: l.url, createdAt: l.createdAt.toISOString() };
}
