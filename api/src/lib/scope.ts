// Household-scoped lookups shared by the routes. Every read/write of a
// workstream, task or link goes through one of these, so another household's
// id (or a malformed one) is always a 404.
import { and, eq } from "drizzle-orm";
import { db, type DbOrTx } from "../db/index.js";
import { links, tasks, users, workstreams } from "../db/schema.js";
import { invalid, notFound } from "./errors.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertId(id: string): string {
  if (!UUID.test(id)) throw notFound();
  return id;
}

export async function getWorkstream(householdId: string, id: string, q: DbOrTx = db) {
  const [w] = await q
    .select()
    .from(workstreams)
    .where(and(eq(workstreams.id, assertId(id)), eq(workstreams.householdId, householdId)))
    .limit(1);
  if (!w) throw notFound("Workstream not found.");
  return w;
}

export async function getTask(householdId: string, id: string, q: DbOrTx = db) {
  const [row] = await q
    .select({ task: tasks, workstreamTitle: workstreams.title })
    .from(tasks)
    .innerJoin(workstreams, eq(workstreams.id, tasks.workstreamId))
    .where(and(eq(tasks.id, assertId(id)), eq(tasks.householdId, householdId)))
    .limit(1);
  if (!row) throw notFound("Task not found.");
  return row;
}

export async function getLink(householdId: string, id: string) {
  const [row] = await db
    .select({ link: links })
    .from(links)
    .innerJoin(workstreams, eq(workstreams.id, links.workstreamId))
    .where(and(eq(links.id, assertId(id)), eq(workstreams.householdId, householdId)))
    .limit(1);
  if (!row) throw notFound("Link not found.");
  return row.link;
}

/** A user id given as owner/assignee must be in the caller's household (null = both). */
export async function assertMember(householdId: string, userId: string | null | undefined, field: string) {
  if (userId === null || userId === undefined) return;
  const ok = UUID.test(userId)
    ? await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.householdId, householdId)))
        .limit(1)
    : [];
  if (!ok.length) throw invalid(`invalid_${field}`, `${field} must be a member of your household.`);
}
