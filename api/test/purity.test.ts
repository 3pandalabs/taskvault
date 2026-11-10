import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// These modules must stay importable with no environment (CLAUDE.md rule).
const PURE = ["dates", "reminders", "today", "csv", "importPlan", "emails", "types", "views"];

describe("pure modules", () => {
  for (const name of PURE) {
    it(`src/lib/${name}.ts imports neither env nor db at runtime`, () => {
      const src = readFileSync(new URL(`../src/lib/${name}.ts`, import.meta.url), "utf8");
      const runtimeImports = src.split("\n").filter((l) => /^import\s(?!type\b)/.test(l));
      for (const line of runtimeImports) {
        expect(line).not.toMatch(/env\.js|\/db\/|mailer\.js|nodemailer|\bpg\b/);
      }
    });
  }
});
