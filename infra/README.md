# TaskVault — provisioning & deploy runbook

Follows `knowledge_base/launching-a-new-app.md`. Box: Hetzner `nrighar-coolify-fsn` (167.233.223.241). App databases live in Postgres container `fj1trumhdfozqharrsx1frm9` (check with `\l` first; the box has two postgres containers).

## 1. Database (superuser, once)
```sql
CREATE ROLE taskvault_app LOGIN PASSWORD '<generated>';
CREATE DATABASE taskvault OWNER taskvault_app;
\c taskvault
ALTER SCHEMA public OWNER TO taskvault_app;
```

## 2. DNS (Cloudflare, before the first Coolify deploy)
- `api.taskvault.3pandalabs.com` → box IP, **proxied** (orange).
- `api-internal.taskvault.3pandalabs.com` → box IP, grey (unused by v1; reserved).
- `taskvault.3pandalabs.com` is created by wrangler from `web/wrangler.jsonc` — don't add it by hand.
- A new `api.taskvault` hostname can fail TLS for a few hours (curl exit 35) until the per-app Total TLS cert issues. Wait; don't debug the origin.

## 3. Mailer
Add `taskvault` to the mailer Worker (`3pandalabs/mailer`): token in `APP_TOKENS`, sender in `APP_SENDERS` (must be on `rsvpvault.3pandalabs.com`, the only verified domain), quota in `APP_QUOTAS` (≈20/day is plenty), then `npx wrangler deploy`. Alternatively set `SMTP_USER`/`SMTP_PASS` (3pandalabs Gmail app password, port 587) like BorrowVault, and the gateway is the fallback.

## 4. Coolify app `taskvault-api`
Public repo source `3pandalabs/taskvault`, branch `main`, Base Directory `api`, Dockerfile `Dockerfile`, port 8080, domain `https://api.taskvault.3pandalabs.com`. **All env vars runtime-only** (`is_buildtime=false`):
`DATABASE_URL`, `JWT_SECRET`, `WEB_URL=https://taskvault.3pandalabs.com`, `MAILER_TOKEN` (and/or `SMTP_USER`/`SMTP_PASS`), `METRICS_TOKEN` (shared org token), `REMINDERS_ENABLED=true`. Deploy, then once in the container: `SEED_USERS='[…]' npm run db:seed`.

## 5. Web
`cd web && npm run cf:deploy` (creates the `taskvault-web` Worker and the `taskvault.3pandalabs.com` custom domain).

## 6. Org surfaces
Admin site (`METRICS_TARGETS`, Apps row, usage table, flow diagram, cost card), `knowledge_base/tech-stack.md` section, Uptime Kuma monitor for `https://api.taskvault.3pandalabs.com/health`, Claude memory. Skip the public website card and Search Console (private app).

## 7. Real-flow check
Log in on a phone, create a workstream and a task due tomorrow, confirm the reminder email arrives, add a Drive link, mark done, import the old spreadsheet CSV.
