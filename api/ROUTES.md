# TaskVault API contract

**This file is the contract between `api/` and `web/`. Change it first, then code.**

- Base URL: `https://api.taskvault.3pandalabs.com` (local dev: `http://localhost:8080`). No `/v1` prefix.
- JSON in and out. Dates are `YYYY-MM-DD` strings (calendar dates, no time). Timestamps are ISO-8601 strings.
- Auth: `Authorization: Bearer <accessToken>` on every route except `/health`, `/auth/*`, and `/metrics` (which uses its own token).
- CORS: origin `WEB_URL`; methods GET, POST, PATCH, DELETE, OPTIONS; headers `authorization`, `content-type`.
- Errors: `{ "error": "<snake_case_code>", "message": "<human text>" }` with a 4xx/5xx status. On a `401` the web calls `/auth/refresh` once, then retries; if that fails it goes to `/login`.
- Scoping: everything belongs to a **household**. A user only sees rows of their own household. Another household's id → `404`.
- There is **no signup**. Users are created by `npm run db:seed` from the `SEED_USERS` env var (see `.env.example`).

## Enums

- `Priority` = `"high" | "medium" | "low"`
- `WorkstreamStatus` = `"active" | "waiting" | "done"` (`waiting` = blocked on someone else, e.g. USCIS)
- `TaskStatus` = `"open" | "done"`

## Shapes

```ts
User       = { id: string, email: string, name: string, timezone: string /* IANA, e.g. "America/New_York" */, digestEnabled: boolean }
Member     = { id: string, name: string }

Workstream = {
  id: string, title: string, description: string | null,
  status: WorkstreamStatus, priority: Priority,
  ownerId: string | null,          // null = both / whole household
  nextStep: string | null,         // free text, "the one next thing to do"
  notes: string | null,            // free text, multi-line
  createdAt: string, updatedAt: string
}
WorkstreamSummary = Workstream & {
  openTasks: number, overdueTasks: number,
  nextDue: { taskId: string, title: string, dueDate: string } | null   // earliest open task with a due date
}
Task = {
  id: string, workstreamId: string, workstreamTitle: string,
  title: string, notes: string | null,
  dueDate: string | null, priority: Priority, status: TaskStatus,
  assigneeId: string | null,       // null = both
  doneAt: string | null, createdAt: string, updatedAt: string
}
Link = { id: string, workstreamId: string, taskId: string | null, title: string | null, url: string, createdAt: string }
```

## Routes

### Health / ops
- `GET /health` → `{ ok: true }`
- `GET /metrics` → org metrics envelope. Bearer `METRICS_TOKEN`; unset → `503 metrics_disabled`, wrong → `401`.

### Auth
- `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, user: User }`. Wrong creds → `401 invalid_credentials`. Rate-limited.
- `POST /auth/refresh` `{ refreshToken }` → `{ accessToken, refreshToken }` (rotates).
- `POST /auth/logout` `{ refreshToken }` → `204`.
- `POST /auth/password-reset/request` `{ email }` → `204` always (no account enumeration). Emails a link `${WEB_URL}/reset-password?token=...` valid 1 hour.
- `POST /auth/password-reset/confirm` `{ token, password }` → `204`. Password min 8 chars. Bad/expired/used token → `400 invalid_token`.

### Me / household
- `GET /me` → `User`
- `PATCH /me` `{ name?, timezone?, digestEnabled? }` → `User`
- `POST /me/password` `{ currentPassword, newPassword }` → `204`. Wrong current password → `400 wrong_password` (not 401).
- `GET /members` → `Member[]` (everyone in my household, including me)

### Workstreams
- `GET /workstreams?status=active|waiting|done|all` (default: `active` + `waiting`) → `WorkstreamSummary[]`, sorted by priority (high first), then `nextDue.dueDate` (soonest first, nulls last), then title.
- `POST /workstreams` `{ title, description?, status?="active", priority?="medium", ownerId?=null, nextStep?, notes? }` → `201 Workstream`
- `GET /workstreams/:id` → `{ workstream: WorkstreamSummary, tasks: Task[], links: Link[] }`. Tasks: open first (by dueDate asc, nulls last, then priority), then done (by doneAt desc).
- `PATCH /workstreams/:id` (any subset of the POST fields; `null` clears nullable fields) → `Workstream`
- `DELETE /workstreams/:id` → `204` (cascades tasks + links)

### Tasks
- `POST /workstreams/:id/tasks` `{ title, notes?, dueDate?, priority?="medium", assigneeId?=null }` → `201 Task`
- `PATCH /tasks/:id` `{ title?, notes?, dueDate?, priority?, assigneeId?, status? }` → `Task`. Setting `status:"done"` sets `doneAt`; `"open"` clears it. Changing `dueDate` resets that task's sent reminders.
- `DELETE /tasks/:id` → `204`. The task's links stay on the workstream (`taskId` becomes null).

### Links (docs)
- `POST /workstreams/:id/links` `{ url, title?, taskId? }` → `201 Link`. `url` must be `http(s)://`. `taskId` must belong to the same workstream.
- `DELETE /links/:id` → `204`

### Today
- `GET /today` → computed in the **caller's timezone**:
```ts
{
  date: string,                       // today, YYYY-MM-DD, caller's tz
  overdue: Task[],                    // open, dueDate < today
  dueToday: Task[],                   // open, dueDate == today
  thisWeek: Task[],                   // open, today < dueDate <= today+7
  nextSteps: { workstreamId: string, title: string, priority: Priority, status: WorkstreamStatus, nextStep: string }[]
                                      // active/waiting workstreams with a non-empty nextStep
}
```
Each task list sorted by dueDate asc, then priority (high first). `nextSteps` sorted by priority then title.

### Import (one-time from the spreadsheet)
- `POST /import/csv` `{ csv: string, dryRun?: boolean }` → `{ workstreamsCreated: number, tasksCreated: number, linksCreated: number, errors: { row: number, message: string }[] }`
  - Header row required; column names case-insensitive. Recognised columns (others ignored):
    `workstream` (required), `task`, `due` (YYYY-MM-DD, M/D/YYYY or D-Mon-YYYY), `priority` (high/medium/low or h/m/l, default medium), `status` (open/done, or done/complete/yes/x = done), `owner` (member name, case-insensitive; blank/both = null), `next step`, `notes`, `link`/`url`.
  - Rows are grouped by `workstream` title; an existing workstream with the same title (case-insensitive) is reused, not duplicated.
  - A row with no `task` just sets the workstream's `next step`/`notes`/`link`.
  - `dryRun: true` validates and returns counts without writing. Max 2,000 rows.

## Reminders (background, not a route)

Runs inside the API process every 15 minutes (`setInterval(...).unref()`), off when `REMINDERS_ENABLED=false`.

- **Task reminders:** for each open task with a `dueDate`, recipients = the assignee, or every household member when `assigneeId` is null. For each recipient, compute `daysLeft` = dueDate − today (recipient's timezone). Send one email per stage: `7` (daysLeft == 7), `1` (daysLeft == 1), `0` (due today), `overdue` (daysLeft == −1). Each `(task, user, stage)` is sent at most once (table `task_reminders`, unique). Never send between 22:00 and 07:00 recipient-local; it waits for the next sweep. Changing a task's dueDate deletes its `task_reminders` rows.
- **Daily digest:** if `digestEnabled` and recipient-local hour ≥ 7 and `lastDigestDate` < local today, send one email: overdue, due today, next 7 days, and next steps (household-wide), then set `lastDigestDate`. Skip if all four lists are empty.
- Email links go to `${WEB_URL}/workstreams/<id>`.
