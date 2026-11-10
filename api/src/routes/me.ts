import { asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { hashSecret, verifySecret } from "../auth/password.js";
import { me, requireUser } from "../auth/plugin.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { isValidTimeZone } from "../lib/dates.js";
import { invalid } from "../lib/errors.js";
import { userView } from "../lib/views.js";
import { newPassword } from "./auth.js";

export async function meRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRequest", requireUser);
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get("/me", async (req) => userView(me(req)));

  app.patch(
    "/me",
    {
      schema: {
        body: z.object({
          name: z.string().trim().min(1).max(120).optional(),
          timezone: z.string().refine(isValidTimeZone, "unknown IANA timezone").optional(),
          digestEnabled: z.boolean().optional(),
        }),
      },
    },
    async (req) => {
      const [u] = await db
        .update(users)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(users.id, me(req).id))
        .returning();
      return userView(u);
    },
  );

  app.post(
    "/me/password",
    { schema: { body: z.object({ currentPassword: z.string().min(1).max(200), newPassword }) } },
    async (req, reply) => {
      const user = me(req);
      if (!(await verifySecret(req.body.currentPassword, user.passwordHash))) {
        throw invalid("wrong_password", "Current password is wrong.");
      }
      await db
        .update(users)
        .set({ passwordHash: await hashSecret(req.body.newPassword), updatedAt: new Date() })
        .where(eq(users.id, user.id));
      // Sessions are left alone: the access token carries no session id, so we
      // can't tell the caller's session from other devices' (password-reset
      // confirm does revoke them all).
      return reply.code(204).send();
    },
  );

  app.get("/members", async (req) => {
    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.householdId, me(req).householdId))
      .orderBy(asc(users.name));
    return rows;
  });
}
