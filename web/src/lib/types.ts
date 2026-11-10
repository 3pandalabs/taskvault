// Mirrors api/ROUTES.md "Enums" and "Shapes" exactly. Change ROUTES.md first.

export type Priority = "high" | "medium" | "low";
export type WorkstreamStatus = "active" | "waiting" | "done";
export type TaskStatus = "open" | "done";

/** A calendar date, `YYYY-MM-DD`. Never parse with `new Date(s)`; use lib/dates. */
export type ISODate = string;

export type User = {
  id: string;
  email: string;
  name: string;
  /** IANA, e.g. "America/New_York" */
  timezone: string;
  digestEnabled: boolean;
};

export type Member = { id: string; name: string };

export type Workstream = {
  id: string;
  title: string;
  description: string | null;
  status: WorkstreamStatus;
  priority: Priority;
  /** null = both / whole household */
  ownerId: string | null;
  nextStep: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkstreamSummary = Workstream & {
  openTasks: number;
  overdueTasks: number;
  nextDue: { taskId: string; title: string; dueDate: ISODate } | null;
};

export type Task = {
  id: string;
  workstreamId: string;
  workstreamTitle: string;
  title: string;
  notes: string | null;
  dueDate: ISODate | null;
  priority: Priority;
  status: TaskStatus;
  /** null = both */
  assigneeId: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Link = {
  id: string;
  workstreamId: string;
  taskId: string | null;
  title: string | null;
  url: string;
  createdAt: string;
};

export type AuthResponse = { accessToken: string; refreshToken: string; user: User };
export type TokenPair = { accessToken: string; refreshToken: string };

export type WorkstreamFilter = WorkstreamStatus | "all";

export type WorkstreamInput = {
  title: string;
  description?: string | null;
  status?: WorkstreamStatus;
  priority?: Priority;
  ownerId?: string | null;
  nextStep?: string | null;
  notes?: string | null;
};
export type WorkstreamPatch = Partial<WorkstreamInput>;

export type WorkstreamDetail = { workstream: WorkstreamSummary; tasks: Task[]; links: Link[] };

export type TaskInput = {
  title: string;
  notes?: string | null;
  dueDate?: ISODate | null;
  priority?: Priority;
  assigneeId?: string | null;
};
export type TaskPatch = Partial<TaskInput> & { status?: TaskStatus };

export type LinkInput = { url: string; title?: string; taskId?: string };

export type NextStepItem = {
  workstreamId: string;
  title: string;
  priority: Priority;
  status: WorkstreamStatus;
  nextStep: string;
};

export type Today = {
  date: ISODate;
  overdue: Task[];
  dueToday: Task[];
  thisWeek: Task[];
  nextSteps: NextStepItem[];
};

export type ImportResult = {
  workstreamsCreated: number;
  tasksCreated: number;
  linksCreated: number;
  errors: { row: number; message: string }[];
};
