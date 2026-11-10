import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { me, requireUser } from "../auth/plugin.js";
import { db } from "../db/index.js";
import { links, tasks, users, workstreams } from "../db/schema.js";
import { CsvError, parseCsv } from "../lib/csv.js";
import { invalid } from "../lib/errors.js";
import { ImportError, planImport } from "../lib/importPlan.js";

// One-time import from the old spreadsheet (ROUTES.md "Import"). Parsing and
// mapping are pure (lib/csv.ts, lib/importPlan.ts); this only reads the
// household's members/workstreams and writes the plan in one transaction.

export async function importRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", requireUser);
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/import/csv",
    {
      bodyLimit: 5 * 1024 * 1024,
      schema: { body: z.object({ csv: z.string().min(1).max(5_000_000), dryRun: z.boolean().optional() }) },
    },
    async (req) => {
      const user = me(req);
      let rows: string[][];
      try {
        rows = parseCsv(req.body.csv);
      } catch (err) {
        if (err instanceof CsvError) throw invalid("invalid_csv", `Could not parse the CSV: ${err.message}.`);
        throw err;
      }
      const [members, existing] = await Promise.all([
        db.select({ id: users.id, name: users.name }).from(users).where(eq(users.householdId, user.householdId)),
        db.select({ id: workstreams.id, title: workstreams.title }).from(workstreams).where(eq(workstreams.householdId, user.householdId)),
      ]);
      let plan;
      try {
        plan = planImport(rows, members, existing);
      } catch (err) {
        if (err instanceof ImportError) throw invalid(err.code, err.message);
        throw err;
      }
      const result = { ...plan.counts, errors: plan.errors };
      if (req.body.dryRun) return result;

      await db.transaction(async (tx) => {
        const now = new Date();
        for (const ws of plan.workstreams) {
          const fields = {
            ...(ws.priority ? { priority: ws.priority } : {}),
            ...(ws.ownerId !== undefined ? { ownerId: ws.ownerId } : {}),
            ...(ws.nextStep ? { nextStep: ws.nextStep } : {}),
            ...(ws.notes.length ? { notes: ws.notes.join("\n") } : {}),
          };
          let wsId = ws.existingId;
          if (wsId) {
            if (Object.keys(fields).length) {
              await tx.update(workstreams).set({ ...fields, updatedAt: now }).where(eq(workstreams.id, wsId));
            }
          } else {
            const [created] = await tx
              .insert(workstreams)
              .values({ ...fields, title: ws.title, householdId: user.householdId })
              .returning({ id: workstreams.id });
            wsId = created.id;
          }
          if (ws.links.length) {
            await tx.insert(links).values(ws.links.map((url) => ({ workstreamId: wsId!, url })));
          }
          for (const t of ws.tasks) {
            const [task] = await tx
              .insert(tasks)
              .values({
                householdId: user.householdId,
                workstreamId: wsId,
                title: t.title,
                notes: t.notes,
                dueDate: t.dueDate,
                priority: t.priority,
                status: t.status,
                assigneeId: t.assigneeId,
                doneAt: t.status === "done" ? now : null,
              })
              .returning({ id: tasks.id });
            if (t.links.length) {
              await tx.insert(links).values(t.links.map((url) => ({ workstreamId: wsId!, taskId: task.id, url })));
            }
          }
        }
      });
      req.log.info({ ...plan.counts, errors: plan.errors.length }, "csv import applied");
      return result;
    },
  );
}
