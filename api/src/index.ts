import cors from "@fastify/cors";
import Fastify, { type FastifyError } from "fastify";
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from "fastify-type-provider-zod";
import { authPlugin } from "./auth/plugin.js";
import { env } from "./env.js";
import { ApiError } from "./lib/errors.js";
import { loggerOptions } from "./lib/logRedact.js";
import { mailerConfigured } from "./lib/mailer.js";
import { recordRequest, startCpuSampler } from "./metrics/collector.js";
import { startReminderSweep } from "./reminders/sweep.js";
import { authRoutes } from "./routes/auth.js";
import { importRoutes } from "./routes/import.js";
import { meRoutes } from "./routes/me.js";
import { metricsRoutes } from "./routes/metrics.js";
import { workstreamRoutes } from "./routes/workstreams.js";

const app = Fastify({
  // Paths only: query strings never reach the logs. Bodies are never logged.
  logger: loggerOptions,
  // Traefik (and Cloudflare) sit in front; without this req.ip is the proxy.
  trustProxy: true,
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(cors, { origin: env.CORS_ORIGINS, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["authorization", "content-type"],
});
await app.register(authPlugin);

const startedAt = new Date().toISOString();
// `ok` is what the container health check reads; its shape must not change.
app.get("/health", async () => ({ ok: true, commit: env.GIT_COMMIT, startedAt }));

startCpuSampler();
app.addHook("onResponse", async (req) => {
  if (req.url !== "/metrics" && req.url !== "/health") recordRequest();
});

// Every error body is { error: "<snake_case_code>", message } (ROUTES.md).
app.setErrorHandler((err: FastifyError & { publicCode?: string; validationContext?: string }, req, reply) => {
  if (err instanceof ApiError) {
    return reply.code(err.status).send({ error: err.code, message: err.message });
  }
  if (err.validation) {
    // A malformed :id is just "not found", like another household's id.
    if (err.validationContext === "params") return reply.code(404).send({ error: "not_found", message: "Not found." });
    return reply.code(400).send({ error: "invalid_request", message: err.message || "Invalid request." });
  }
  // Rate limiting (plugins/rateLimit.ts) carries a caller-facing code.
  if (err.publicCode) {
    return reply.code(err.statusCode ?? 429).send({ error: err.publicCode, message: err.message });
  }
  const pgCode = (err as { code?: string }).code;
  if (pgCode === "23505") return reply.code(409).send({ error: "conflict", message: "That already exists." });
  if (pgCode === "23514" || pgCode === "22P02") return reply.code(400).send({ error: "invalid_request", message: "Invalid request." });
  const status = err.statusCode ?? 500;
  if (status < 500) {
    const code = status === 413 ? "payload_too_large" : status === 415 ? "unsupported_media_type" : "bad_request";
    return reply.code(status).send({ error: code, message: err.message || "Bad request." });
  }
  req.log.error({ err: { name: err.name, code: pgCode } }, "unhandled error");
  return reply.code(status).send({ error: "internal_error", message: "Something went wrong." });
});

app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "not_found", message: "Not found." }));

await app.register(authRoutes);
await app.register(meRoutes);
await app.register(workstreamRoutes);
await app.register(importRoutes);
await app.register(metricsRoutes);

if (!mailerConfigured()) app.log.info("mail disabled (no SMTP_USER/SMTP_PASS or MAILER_URL/MAILER_TOKEN)");
if (env.REMINDERS_ENABLED) startReminderSweep();
else app.log.info("reminders disabled (REMINDERS_ENABLED=false)");

app.listen({ port: env.PORT, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
