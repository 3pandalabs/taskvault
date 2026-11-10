import { and, asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { me, requireUser } from "../auth/plugin.js";
import { db } from "../db/index.js";
import { links, taskReminders, tasks, workstreams } from "../db/schema.js";
import { addDays, isYmd, localDate } from "../lib/dates.js";
import { invalid } from "../lib/errors.js";
import { isHttpUrl } from "../lib/importPlan.js";
import { assertId, assertMember, getLink, getTask, getWorkstream } from "../lib/scope.js";
import { bucketTasks, selectNextSteps, sortSummaries, sortWorkstreamTasks, summarize } from "../lib/today.js";
import { PRIORITIES, TASK_STATUSES, WORKSTREAM_STATUSES } from "../lib/types.js";
import { linkView, taskView, workstreamView } from "../lib/views.js";

// Workstreams, tasks, links and Today (ROUTES.md). Every query is scoped by
// the caller's household via lib/scope.ts.

/** Optional nullable text: undefined = unchanged, "" or whitespace = null. */
const text = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined || v === null ? v : v.trim() === "" ? null : v));

const title = (max: number) => z.string().trim().min(1).max(max);
const userId = z.string().nullable().optional();
const dueDate = z
  .string()
  .refine(isYmd, "dueDate must be a real date in YYYY-MM-DD form")
  .nullable()
  .optional();
const idParams = z.object({ id: z.string() });

const workstreamFields = {
  description: text(5000),
  status: z.enum(WORKSTREAM_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  ownerId: userId,
  nextStep: text(2000),
  notes: text(20000),
};

const taskFields = {
  notes: text(20000),
  dueDate,
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: userId,
};

const stripUndefined = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export async function workstreamRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", requireUser);
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // ---------------------------------------------------------- workstreams --

  app.get(
    "/workstreams",
    { schema: { querystring: z.object({ status: z.enum(["active", "waiting", "done", "all"]).optional() }) } },
    async (req) => {
      const user = me(req);
      const status = req.query.status;
      const statuses = status === "all" ? WORKSTREAM_STATUSES : status ? [status] : (["active", "waiting"] as const);
      const ws = await db
        .select()
        .from(workstreams)
        .where(and(eq(workstreams.householdId, user.householdId), inArray(workstreams.status, [...statuses])));
      const open = ws.length
        ? await db
            .select()
            .from(tasks)
            .where(and(inArray(tasks.workstreamId, ws.map((w) => w.id)), eq(tasks.status, "open")))
        : [];
      return sortSummaries(summarize(ws.map(workstreamView), open, localDate(new Date(), user.timezone)));
    },
  );

  app.post(
    "/workstreams",
    { schema: { body: z.object({ title: title(200), ...workstreamFields }) } },
    async (req, reply) => {
      const user = me(req);
      await assertMember(user.householdId, req.body.ownerId, "ownerId");
      const [w] = await db
        .insert(workstreams)
        .values({ ...stripUndefined(req.body), title: req.body.title, householdId: user.householdId })
        .returning();
      req.log.info({ workstreamId: w.id }, "workstream created");
      return reply.code(201).send(workstreamView(w));
    },
  );

  app.get("/workstreams/:id", { schema: { params: idParams } }, async (req) => {
    const user = me(req);
    const w = await getWorkstream(user.householdId, req.params.id);
    const [taskRows, linkRows] = await Promise.all([
      db.select().from(tasks).where(eq(tasks.workstreamId, w.id)),
      db.select().from(links).where(eq(links.workstreamId, w.id)).orderBy(asc(links.createdAt)),
    ]);
    const [summary] = summarize([workstreamView(w)], taskRows, localDate(new Date(), user.timezone));
    return {
      workstream: summary,
      tasks: sortWorkstreamTasks(taskRows.map((t) => taskView(t, w.title))),
      links: linkRows.map(linkView),
    };
  });

  app.patch(
    "/workstreams/:id",
    { schema: { params: idParams, body: z.object({ title: title(200).optional(), ...workstreamFields }) } },
    async (req) => {
      const user = me(req);
      const w = await getWorkstream(user.householdId, req.params.id);
      await assertMember(user.householdId, req.body.ownerId, "ownerId");
      const [updated] = await db
        .update(workstreams)
        .set({ ...stripUndefined(req.body), updatedAt: new Date() })
        .where(eq(workstreams.id, w.id))
        .returning();
      return workstreamView(updated);
    },
  );

  app.delete("/workstreams/:id", { schema: { params: idParams } }, async (req, reply) => {
    const w = await getWorkstream(me(req).householdId, req.params.id);
    await db.delete(workstreams).where(eq(workstreams.id, w.id)); // FK cascade: tasks, links, reminders
    req.log.info({ workstreamId: w.id }, "workstream deleted");
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------- tasks --

  app.post(
    "/workstreams/:id/tasks",
    { schema: { params: idParams, body: z.object({ title: title(500), ...taskFields }) } },
    async (req, reply) => {
      const user = me(req);
      const w = await getWorkstream(user.householdId, req.params.id);
      await assertMember(user.householdId, req.body.assigneeId, "assigneeId");
      const [t] = await db
        .insert(tasks)
        .values({ ...stripUndefined(req.body), title: req.body.title, workstreamId: w.id, householdId: user.householdId })
        .returning();
      req.log.info({ taskId: t.id, workstreamId: w.id }, "task created");
      return reply.code(201).send(taskView(t, w.title));
    },
  );

  app.patch(
    "/tasks/:id",
    {
      schema: {
        params: idParams,
        body: z.object({ title: title(500).optional(), ...taskFields, status: z.enum(TASK_STATUSES).optional() }),
      },
    },
    async (req) => {
      const user = me(req);
      const { task, workstreamTitle } = await getTask(user.householdId, req.params.id);
      await assertMember(user.householdId, req.body.assigneeId, "assigneeId");
      const set: Partial<typeof tasks.$inferInsert> = { ...stripUndefined(req.body), updatedAt: new Date() };
      if (req.body.status === "done") set.doneAt = task.status === "done" && task.doneAt ? task.doneAt : new Date();
      if (req.body.status === "open") set.doneAt = null;
      const dueChanged = req.body.dueDate !== undefined && req.body.dueDate !== task.dueDate;
      const updated = await db.transaction(async (tx) => {
        const [t] = await tx.update(tasks).set(set).where(eq(tasks.id, task.id)).returning();
        // New deadline → its 7/1/0/overdue reminders can fire again.
        if (dueChanged) await tx.delete(taskReminders).where(eq(taskReminders.taskId, task.id));
        return t;
      });
      return taskView(updated, workstreamTitle);
    },
  );

  app.delete("/tasks/:id", { schema: { params: idParams } }, async (req, reply) => {
    const { task } = await getTask(me(req).householdId, req.params.id);
    await db.delete(tasks).where(eq(tasks.id, task.id));
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------- links --

  app.post(
    "/workstreams/:id/links",
    {
      schema: {
        params: idParams,
        body: z.object({
          url: z.string().trim().min(1).max(2000),
          title: text(300),
          taskId: z.string().nullable().optional(),
        }),
      },
    },
    async (req, reply) => {
      const user = me(req);
      const w = await getWorkstream(user.householdId, req.params.id);
      if (!isHttpUrl(req.body.url)) throw invalid("invalid_url", "url must start with http:// or https://");
      let taskId: string | null = null;
      if (req.body.taskId) {
        const found = /^[0-9a-f-]{36}$/i.test(req.body.taskId)
          ? await db
              .select({ id: tasks.id })
              .from(tasks)
              .where(and(eq(tasks.id, req.body.taskId), eq(tasks.workstreamId, w.id)))
              .limit(1)
          : [];
        if (!found.length) throw invalid("invalid_task", "taskId must be a task in this workstream.");
        taskId = found[0].id;
      }
      const [l] = await db
        .insert(links)
        .values({ workstreamId: w.id, taskId, url: req.body.url, title: req.body.title ?? null })
        .returning();
      return reply.code(201).send(linkView(l));
    },
  );

  app.delete("/links/:id", { schema: { params: idParams } }, async (req, reply) => {
    const l = await getLink(me(req).householdId, req.params.id);
    await db.delete(links).where(eq(links.id, assertId(l.id)));
    return reply.code(204).send();
  });

  // ---------------------------------------------------------------- today --

  app.get("/today", async (req) => {
    const user = me(req);
    const today = localDate(new Date(), user.timezone);
    const [taskRows, wsRows] = await Promise.all([
      db
        .select({ task: tasks, workstreamTitle: workstreams.title })
        .from(tasks)
        .innerJoin(workstreams, eq(workstreams.id, tasks.workstreamId))
        .where(and(eq(tasks.householdId, user.householdId), eq(tasks.status, "open"))),
      db
        .select()
        .from(workstreams)
        .where(and(eq(workstreams.householdId, user.householdId), inArray(workstreams.status, ["active", "waiting"]))),
    ]);
    const weekEnd = addDays(today, 7);
    const views = taskRows.filter((r) => r.task.dueDate && r.task.dueDate <= weekEnd).map((r) => taskView(r.task, r.workstreamTitle));
    return { date: today, ...bucketTasks(views, today), nextSteps: selectNextSteps(wsRows) };
  });
}
