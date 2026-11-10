// Drizzle mirror of drizzle/0000_init.sql. The SQL is the source of truth:
// migrations are hand-written and idempotent; keep this file in step with them.
import { boolean, date, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);
export const workstreamStatusEnum = pgEnum("workstream_status", ["active", "waiting", "done"]);
export const taskStatusEnum = pgEnum("task_status", ["open", "done"]);

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  digestEnabled: boolean("digest_enabled").notNull().default(true),
  lastDigestDate: date("last_digest_date", { mode: "string" }),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const workstreams = pgTable("workstreams", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: workstreamStatusEnum("status").notNull().default("active"),
  priority: priorityEnum("priority").notNull().default("medium"),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  nextStep: text("next_step"),
  notes: text("notes"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  workstreamId: uuid("workstream_id").notNull().references(() => workstreams.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  notes: text("notes"),
  dueDate: date("due_date", { mode: "string" }),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("open"),
  assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
  doneAt: ts("done_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  workstreamId: uuid("workstream_id").notNull().references(() => workstreams.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  title: text("title"),
  url: text("url").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const taskReminders = pgTable(
  "task_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    sentAt: ts("sent_at").notNull().defaultNow(),
  },
  (t) => [unique("task_reminders_task_user_stage_unique").on(t.taskId, t.userId, t.stage)],
);
