import { timingSafeEqual } from "node:crypto";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/index.js";
import { env } from "../env.js";
import { cpuPercentOfOneCore, requestsLastHour } from "../metrics/collector.js";

// Ops-only endpoint scraped server-side by admin.3pandalabs.com. Own bearer
// token (METRICS_TOKEN, optional -> 503), aggregate counts only, nothing that
// identifies a user. The envelope (app/collectedAt/uptimeSeconds/counts/
// traffic/process/database) is shared across every 3PandaLabs app; only the
// `counts` keys are per-app.

function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type CountsRow = {
  households: number;
  users: number;
  workstreams: number;
  open_tasks: number;
  reminders_sent_last_24h: number;
};

type DatabaseRow = { size_bytes: string; size_pretty: string; connections: number };

export async function metricsRoutes(app: FastifyInstance) {
  app.get("/metrics", async (req, reply) => {
    if (!env.METRICS_TOKEN) return reply.code(503).send({ error: "metrics_disabled", message: "Metrics are not configured." });
    const header = req.headers.authorization ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!tokenMatches(presented, env.METRICS_TOKEN)) return reply.code(401).send({ error: "unauthorized", message: "Bad metrics token." });

    const counts = await db.execute<CountsRow>(sql`
      select
        (select count(*) from households)::int as households,
        (select count(*) from users)::int as users,
        (select count(*) from workstreams)::int as workstreams,
        (select count(*) from tasks where status = 'open')::int as open_tasks,
        (select count(*) from task_reminders where sent_at > now() - interval '24 hours')::int as reminders_sent_last_24h
    `);
    const database = await db.execute<DatabaseRow>(sql`
      select
        pg_database_size(current_database()) as size_bytes,
        pg_size_pretty(pg_database_size(current_database())) as size_pretty,
        (select count(*) from pg_stat_activity where datname = current_database())::int as connections
    `);

    const c = counts.rows[0];
    const d = database.rows[0];
    const mem = process.memoryUsage();
    return {
      app: "taskvault",
      collectedAt: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      counts: {
        households: c.households,
        users: c.users,
        workstreams: c.workstreams,
        openTasks: c.open_tasks,
        remindersSentLast24h: c.reminders_sent_last_24h,
      },
      traffic: { apiRequestsLastHour: requestsLastHour() },
      process: { rssBytes: mem.rss, heapUsedBytes: mem.heapUsed, cpuPercentOfOneCore: cpuPercentOfOneCore() },
      database: { sizeBytes: Number(d.size_bytes), sizePretty: d.size_pretty, connections: d.connections },
    };
  });
}
