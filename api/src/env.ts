import "dotenv/config";
import { z } from "zod";

// Validated once at import. Every process that touches the database (API,
// seed, reminders:once) loads this; pure modules under src/lib (dates,
// reminders, digest, today, csv, importPlan, emails) deliberately do not, so
// unit tests run without any environment.
const optional = z.string().optional().default("");

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8080),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars (openssl rand -hex 32)"),

  // The web origin: CORS allow-list and absolute links in emails.
  WEB_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGINS: optional,

  // Reminder + digest sweep (src/reminders/sweep.ts). "false" turns it off.
  REMINDERS_ENABLED: z
    .string()
    .optional()
    .transform((v) => v?.trim().toLowerCase() !== "false"),

  // Optional: unset → GET /metrics answers 503 and nothing else changes.
  METRICS_TOKEN: optional,

  // Mail is optional. Direct SMTP (Gmail app password) wins when USER+PASS are
  // set; otherwise the shared org gateway; with neither, mail is disabled.
  // Port 587 (STARTTLS), not 465: Hetzner blocks outbound 25 and 465.
  MAILER_URL: optional,
  MAILER_TOKEN: optional,
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  EMAIL_FROM_NAME: z.string().default("TaskVault"),

  // Shared with a web Worker (sent as X-Internal-Secret on api-internal calls).
  // Only with it is X-Client-IP trusted for rate-limit keys. Optional.
  INTERNAL_SHARED_SECRET: optional,

  GIT_COMMIT: optional,
  SOURCE_COMMIT: optional,
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
  throw new Error(`Invalid environment: ${issues}`);
}

const e = parsed.data;
const webUrl = e.WEB_URL.replace(/\/$/, "");

export const env = {
  ...e,
  WEB_URL: webUrl,
  CORS_ORIGINS: [
    ...new Set([webUrl, "http://localhost:3000", ...e.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)]),
  ],
  // Coolify injects SOURCE_COMMIT at runtime; GIT_COMMIT is a manual override.
  GIT_COMMIT: e.SOURCE_COMMIT || e.GIT_COMMIT || "unknown",
};
