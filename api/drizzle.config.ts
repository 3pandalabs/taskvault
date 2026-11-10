import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrations in drizzle/ are HAND-WRITTEN idempotent SQL, applied by
// src/db/migrate.ts at container start. This config exists for introspection
// (`drizzle-kit studio`/`check`); don't `generate` over the hand-written files.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://taskvault:taskvault@localhost:5436/taskvault",
  },
  strict: true,
});
