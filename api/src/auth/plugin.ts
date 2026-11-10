import { eq } from "drizzle-orm";
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { verifyAccessToken } from "./jwt.js";

export type CurrentUser = typeof users.$inferSelect;

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
    user?: CurrentUser;
  }
}

function extractBearer(req: FastifyRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

// Attaches req.userId when a valid access token is present; `requireUser`
// rejects and loads the user row (household + timezone) for the handler.
export const authPlugin = fp(async (fastify) => {
  fastify.decorateRequest("userId", undefined);
  fastify.decorateRequest("user", undefined);
  fastify.addHook("onRequest", async (req) => {
    const token = extractBearer(req);
    if (!token) return;
    try {
      req.userId = verifyAccessToken(token).sub;
    } catch {
      // invalid/expired: requireUser will 401
    }
  });
});

export async function requireUser(req: FastifyRequest, reply: FastifyReply) {
  if (!req.userId) {
    return reply.code(401).send({ error: "not_authenticated", message: "Sign in required." });
  }
  const [user] = await db.select().from(users).where(eq(users.id, req.userId)).limit(1);
  if (!user) {
    return reply.code(401).send({ error: "not_authenticated", message: "Sign in required." });
  }
  req.user = user;
}

/** The authenticated user. Only call from routes behind `requireUser`. */
export function me(req: FastifyRequest): CurrentUser {
  if (!req.user) throw new Error("requireUser did not run");
  return req.user;
}
