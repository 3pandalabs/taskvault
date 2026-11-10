# TaskVault — CLAUDE.md

Private life-admin tracker (3PandaLabs app #8). Track life **workstreams** (EB5, OCI/passport renewal, car insurance, office…) with tasks, priorities, deadlines, owners, linked docs, next steps, a Today view, and email reminders. Users: one household (the founders) for now; no signup. Origin: `3pandalabs/ideas` → `ideas/docvault.md`.

## Layout
- `api/` — Fastify 5 + drizzle + Postgres. Reminder/digest sweep runs in-process every 15 min. **`api/ROUTES.md` is the contract: change it first, then code.**
- `web/` — Next 16 on a Cloudflare Worker (opennext). `next build --webpack`, no proxy.ts/middleware, `.env.production` committed. Installable PWA.
- `infra/README.md` — provisioning/deploy runbook.

## Rules
- One lowercase identifier: `taskvault` (repo, DB, role `taskvault_app`, Coolify app, hosts, `/metrics` app key, mailer app key). All hostnames under one first label: `taskvault.3pandalabs.com`, `api.taskvault.…`, `api-internal.taskvault.…`. Name chosen 2026-11-09 to be permanent; never rename identifiers or the first-label hostname.
- Branch → PR → merge as `3pandalabs-admin`. Never commit to main, never `git add -A`.
- Personal data: this repo is PUBLIC. Never commit emails, names, passwords, or real workstream data. Seed users come from the `SEED_USERS` env var. Never log task titles, notes, URLs or emails — ids and counts only. Every query scoped by household; other households' rows → 404.
- Migrations are hand-written and idempotent (they run on container start). Never set `MIGRATION_DATABASE_URL`.
- Pure modules (date/tz helpers, reminder stages, digest selection, CSV import mapping, Today bucketing) must not import env/db, so vitest runs with no infrastructure.
- `/metrics` follows the org envelope; keep `metrics/collector.ts` byte-identical across apps. Update the admin flow diagram when routes/auth change.

## Local dev
```
cd api && docker compose -f docker-compose.dev.yml up -d && cp .env.example .env   # fill JWT_SECRET, SEED_USERS
npm run db:migrate && npm run db:seed && npm run dev
cd web && npm run dev            # NEXT_PUBLIC_API_URL=http://localhost:8080
```
