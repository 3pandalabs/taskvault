import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { generateRefreshSecret, parseRefreshToken, REFRESH_TOKEN_TTL_MS, signAccessToken } from "../auth/jwt.js";
import { hashSecret, verifySecret } from "../auth/password.js";
import { db } from "../db/index.js";
import { passwordResetTokens, sessions, users } from "../db/schema.js";
import { env } from "../env.js";
import { keyedLimiter } from "../lib/clientKey.js";
import { passwordResetMail } from "../lib/emails.js";
import { sendMail } from "../lib/mailer.js";
import { userView } from "../lib/views.js";
import { globalLimiter, registerRateLimit } from "../plugins/rateLimit.js";

// Auth, same scheme as BorrowVault/RsvpVault: 15-min JWT access token
// ({sub} only) + rotating opaque refresh token (`<sessionId>.<secret>`,
// bcrypt-hashed at rest). No signup: users come from `npm run db:seed`.

const email = z.string().email().max(320);
export const newPassword = z.string().min(8).max(200);

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour (ROUTES.md)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINUTE = 60_000;

// Bound the mail a single unauthenticated route can trigger, across all callers.
const resetMailBudget = globalLimiter(50, 60 * MINUTE);
// Login: per-IP (route config) + per-email + a global ceiling.
const loginPerEmail = keyedLimiter(10, 15 * MINUTE);
const loginGlobal = globalLimiter(500, 15 * MINUTE);
const DUMMY_HASH = "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";

const invalidRefresh = { error: "invalid_refresh_token", message: "Session expired. Please sign in again." };

async function issueSession(userId: string) {
  const secret = generateRefreshSecret();
  const [session] = await db
    .insert(sessions)
    .values({ userId, refreshTokenHash: await hashSecret(secret), expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) })
    .returning({ id: sessions.id });
  return `${session.id}.${secret}`;
}

export async function authRoutes(fastify: FastifyInstance) {
  await registerRateLimit(fastify);
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 20, timeWindow: 15 * MINUTE } }, schema: { body: z.object({ email, password: z.string().min(1).max(200) }) } },
    async (req, reply) => {
      const emailKey = req.body.email.toLowerCase();
      if (!loginGlobal() || !loginPerEmail(emailKey)) {
        return reply.code(429).send({ error: "rate_limited", message: "Too many attempts. Try again later." });
      }
      const [user] = await db.select().from(users).where(eq(users.email, emailKey)).limit(1);
      const ok = user ? await verifySecret(req.body.password, user.passwordHash) : await verifySecret(req.body.password, DUMMY_HASH).then(() => false);
      if (!user || !ok) return reply.code(401).send({ error: "invalid_credentials", message: "Wrong email or password." });
      return {
        accessToken: signAccessToken({ sub: user.id }),
        refreshToken: await issueSession(user.id),
        user: userView(user),
      };
    },
  );

  app.post(
    "/auth/refresh",
    { config: { rateLimit: { max: 60, timeWindow: 15 * MINUTE } }, schema: { body: z.object({ refreshToken: z.string().min(1).max(500) }) } },
    async (req, reply) => {
      const parsed = parseRefreshToken(req.body.refreshToken);
      if (!parsed) return reply.code(401).send(invalidRefresh);
      const [session] = await db.select().from(sessions).where(eq(sessions.id, parsed.sessionId)).limit(1);
      if (!session || session.expiresAt.getTime() < Date.now() || !(await verifySecret(parsed.secret, session.refreshTokenHash))) {
        return reply.code(401).send(invalidRefresh);
      }
      // Rotate: a stolen refresh token works at most once.
      const deleted = await db.delete(sessions).where(eq(sessions.id, session.id)).returning({ id: sessions.id });
      if (!deleted.length) return reply.code(401).send(invalidRefresh);
      return { accessToken: signAccessToken({ sub: session.userId }), refreshToken: await issueSession(session.userId) };
    },
  );

  // Unauthenticated per ROUTES.md (`/auth/*`); only a token whose secret
  // verifies can end its session, so a bare session id is useless.
  app.post(
    "/auth/logout",
    { config: { rateLimit: { max: 60, timeWindow: 15 * MINUTE } }, schema: { body: z.object({ refreshToken: z.string().min(1).max(500) }) } },
    async (req, reply) => {
      const parsed = parseRefreshToken(req.body.refreshToken);
      if (parsed) {
        const [session] = await db.select().from(sessions).where(eq(sessions.id, parsed.sessionId)).limit(1);
        if (session && (await verifySecret(parsed.secret, session.refreshTokenHash))) {
          await db.delete(sessions).where(eq(sessions.id, session.id));
        }
      }
      return reply.code(204).send();
    },
  );

  // --- password reset: both answer identically whether or not the account exists.

  app.post(
    "/auth/password-reset/request",
    { config: { rateLimit: { max: 5, timeWindow: 60 * MINUTE } }, schema: { body: z.object({ email }) } },
    async (req, reply) => {
      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.email, req.body.email.toLowerCase()))
        .limit(1);
      const secret = randomBytes(32).toString("base64url");
      const tokenHash = await hashSecret(secret);
      if (user && resetMailBudget()) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
        const [row] = await db
          .insert(passwordResetTokens)
          .values({ userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) })
          .returning({ id: passwordResetTokens.id });
        const url = `${env.WEB_URL}/reset-password?token=${encodeURIComponent(`${row.id}.${secret}`)}`;
        // Not awaited, and fail-soft, so timing can't enumerate accounts.
        void sendMail([passwordResetMail(user.email, url)], (msg) => req.log.info({ userId: user.id }, msg)).catch(() =>
          req.log.warn({ userId: user.id }, "password reset mail failed"),
        );
      }
      return reply.code(204).send();
    },
  );

  app.post(
    "/auth/password-reset/confirm",
    {
      config: { rateLimit: { max: 10, timeWindow: 15 * MINUTE } },
      schema: { body: z.object({ token: z.string().min(1).max(500), password: newPassword }) },
    },
    async (req, reply) => {
      const [id, secret] = req.body.token.split(".");
      const invalidToken = () => reply.code(400).send({ error: "invalid_token", message: "This reset link is invalid or has expired." });
      if (!id || !secret || !UUID.test(id)) return invalidToken();
      const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.id, id)).limit(1);
      if (!row || !(await verifySecret(secret, row.tokenHash))) return invalidToken();
      // Atomically consume BEFORE changing the password.
      const consumed = await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.id, row.id), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, sql`now()`)))
        .returning({ userId: passwordResetTokens.userId });
      if (!consumed.length) return invalidToken();
      await db
        .update(users)
        .set({ passwordHash: await hashSecret(req.body.password), updatedAt: new Date() })
        .where(eq(users.id, consumed[0].userId));
      await db.delete(sessions).where(eq(sessions.userId, consumed[0].userId));
      return reply.code(204).send();
    },
  );
}
