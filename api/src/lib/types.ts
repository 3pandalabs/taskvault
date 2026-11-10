// API shapes from ROUTES.md. Pure types, no runtime imports.

export type Priority = "high" | "medium" | "low";
export type WorkstreamStatus = "active" | "waiting" | "done";
export type TaskStatus = "open" | "done";

export const PRIORITIES = ["high", "medium", "low"] as const;
export const WORKSTREAM_STATUSES = ["active", "waiting", "done"] as const;
export const TASK_STATUSES = ["open", "done"] as const;

export type UserView = { id: string; email: string; name: string; timezone: string; digestEnabled: boolean };
export type Member = { id: string; name: string };

export type WorkstreamView = {
  id: string;
  title: string;
  description: string | null;
  status: WorkstreamStatus;
  priority: Priority;
  ownerId: string | null;
  nextStep: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkstreamSummary = WorkstreamView & {
  openTasks: number;
  overdueTasks: number;
  nextDue: { taskId: string; title: string; dueDate: string } | null;
};

export type TaskView = {
  id: string;
  workstreamId: string;
  workstreamTitle: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  assigneeId: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LinkView = {
  id: string;
  workstreamId: string;
  taskId: string | null;
  title: string | null;
  url: string;
  createdAt: string;
};

export type NextStepItem = {
  workstreamId: string;
  title: string;
  priority: Priority;
  status: WorkstreamStatus;
  nextStep: string;
};
