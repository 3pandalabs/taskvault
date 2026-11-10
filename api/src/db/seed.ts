// Creates the household and its users. Idempotent; safe to re-run.
//
// NOT run at container start: it creates accounts. Run it by hand:
// `npm run db:seed` (dev) or `node dist/db/seed.js` (prod container).
// Nothing personal is hardcoded (this repo is public). Input comes from env:
//   SEED_USERS          JSON [{"email","name","password","timezone"?}]
//   SEED_HOUSEHOLD_NAME optional, default "Home"
// Users are upserted by email. An existing user keeps their password and
// household; only name (and timezone, when given) are refreshed.
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { z } from "zod";
import { hashSecret } from "../auth/password.js";
import { isValidTimeZone } from "../lib/dates.js";
import * as schema from "./schema.js";

const { households, users } = schema;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required for the seed");

const seedUsers = z
  .array(
    z.object({
      email: z.string().email(),
      name: z.string().trim().min(1).max(120),
      password: z.string().min(8, "seed passwords must be at least 8 characters").max(200),
      timezone: z.string().refine(isValidTimeZone, "unknown IANA timezone").optional(),
    }),
  )
  .min(1)
  .safeParse(JSON.parse(process.env.SEED_USERS || "[]"));
if (!seedUsers.success) {
  throw new Error(`SEED_USERS is invalid: ${seedUsers.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}
const householdName = process.env.SEED_HOUSEHOLD_NAME?.trim() || "Home";

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool, { schema });

const emails = seedUsers.data.map((u) => u.email.toLowerCase());
const existing = await db.select().from(users).where(inArray(users.email, emails));

// Reuse the household of an already-seeded user, else one with this name, else create.
let householdId = existing[0]?.householdId;
if (!householdId) {
  const [byName] = await db.select().from(households).where(eq(households.name, householdName)).limit(1);
  householdId = byName?.id ?? (await db.insert(households).values({ name: householdName }).returning())[0].id;
}

let created = 0;
let updated = 0;
for (const u of seedUsers.data) {
  const email = u.email.toLowerCase();
  const found = existing.find((x) => x.email === email);
  if (found) {
    await db
      .update(users)
      .set({ name: u.name, ...(u.timezone ? { timezone: u.timezone } : {}), updatedAt: new Date() })
      .where(eq(users.id, found.id));
    updated++;
  } else {
    await db
      .insert(users)
      .values({
        householdId,
        email,
        name: u.name,
        passwordHash: await hashSecret(u.password),
        ...(u.timezone ? { timezone: u.timezone } : {}),
      })
      .onConflictDoNothing({ target: users.email });
    created++;
  }
}

await pool.end();
// Counts and ids only: no emails or names in logs.
console.log(`Seeded household ${householdId}: ${created} user(s) created, ${updated} updated.`);
