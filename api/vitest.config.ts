import { defineConfig } from "vitest/config";

// Pure-unit tests: no Postgres or mail needed. Modules under test (src/lib/
// dates, reminders, digest, today, csv, importPlan, emails) don't import env.ts or db.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
