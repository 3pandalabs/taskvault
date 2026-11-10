// CSV import mapping (ROUTES.md "Import"). Pure: no env/db imports.
// routes/import.ts parses the CSV, calls planImport, then writes the plan
// (or, with dryRun, just returns its counts).
import { isRealDate, ymd } from "./dates.js";
import type { Priority, TaskStatus } from "./types.js";

export const MAX_IMPORT_ROWS = 2000;

export class ImportError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------- mapping --

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * YYYY-MM-DD, M/D/YYYY (US order) or D-Mon-YYYY (e.g. 5-Jan-2027). Blank → null.
 * Throws on anything else, including impossible dates like 2/30/2027.
 */
export function parseDue(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let match: RegExpExecArray | null;
  if ((match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) {
    [m, d, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = /^(\d{1,2})[- ]([A-Za-z]{3,9})[- ](\d{4})$/.exec(s))) {
    const name = match[2].toLowerCase();
    const month = MONTHS[name] ?? MONTHS[name.slice(0, 3)];
    if (!month || !isMonthName(name, month)) throw new Error(`unrecognised month "${match[2]}"`);
    [d, m, y] = [Number(match[1]), month, Number(match[3])];
  } else {
    throw new Error(`unrecognised date "${s}" (use YYYY-MM-DD, M/D/YYYY or D-Mon-YYYY)`);
  }
  if (!isRealDate(y, m, d)) throw new Error(`invalid date "${s}"`);
  return ymd(y, m, d);
}

const FULL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
function isMonthName(name: string, month: number): boolean {
  // "jan", "sept", "january" are fine; "janxyz" is not.
  return FULL_MONTHS[month - 1].startsWith(name) || name === "sept";
}

export function parsePriority(raw: string): Priority {
  const s = raw.trim().toLowerCase();
  if (s === "" ) return "medium";
  if (s === "high" || s === "h") return "high";
  if (s === "medium" || s === "med" || s === "m") return "medium";
  if (s === "low" || s === "l") return "low";
  throw new Error(`unrecognised priority "${raw.trim()}" (use high/medium/low)`);
}

const DONE = new Set(["done", "complete", "completed", "yes", "y", "x", "true"]);
const OPEN = new Set(["", "open", "no", "n", "todo", "to do", "pending", "in progress", "false"]);

export function parseStatus(raw: string): TaskStatus {
  const s = raw.trim().toLowerCase();
  if (DONE.has(s)) return "done";
  if (OPEN.has(s)) return "open";
  throw new Error(`unrecognised status "${raw.trim()}" (use open or done)`);
}

export type ImportMember = { id: string; name: string };

/** Member name, case-insensitive. Blank or "both" → null (whole household). */
export function parseOwner(raw: string, members: ImportMember[]): string | null {
  const s = raw.trim().toLowerCase();
  if (s === "" || s === "both" || s === "all" || s === "everyone") return null;
  const hit = members.filter((m) => m.name.trim().toLowerCase() === s);
  if (hit.length === 1) return hit[0].id;
  if (hit.length > 1) throw new Error(`owner "${raw.trim()}" matches more than one member`);
  throw new Error(`unknown owner "${raw.trim()}"`);
}

export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------- header --

export type Column = "workstream" | "task" | "due" | "priority" | "status" | "owner" | "nextStep" | "notes" | "link";

const ALIASES: Record<string, Column> = {
  workstream: "workstream",
  task: "task",
  due: "due",
  duedate: "due",
  priority: "priority",
  status: "status",
  owner: "owner",
  nextstep: "nextStep",
  notes: "notes",
  link: "link",
  url: "link",
};

/** Column index per recognised name (case/space/punctuation-insensitive). First occurrence wins. */
export function mapHeader(header: string[]): Partial<Record<Column, number>> {
  const out: Partial<Record<Column, number>> = {};
  header.forEach((h, i) => {
    const col = ALIASES[h.toLowerCase().replace(/[^a-z]/g, "")];
    if (col && out[col] === undefined) out[col] = i;
  });
  return out;
}

// ------------------------------------------------------------------- plan --

export type PlannedTask = {
  row: number;
  title: string;
  notes: string | null;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  assigneeId: string | null;
  links: string[];
};

export type PlannedWorkstream = {
  title: string;
  existingId: string | null;
  // Only set when a task-less row gave them; undefined = leave as is / default.
  priority?: Priority;
  ownerId?: string | null;
  nextStep?: string;
  notes: string[];
  links: string[];
  tasks: PlannedTask[];
};

export type ImportPlan = {
  workstreams: PlannedWorkstream[];
  errors: { row: number; message: string }[];
  counts: { workstreamsCreated: number; tasksCreated: number; linksCreated: number };
};

export const titleKey = (title: string) => title.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Maps parsed CSV rows (header first) to a plan. Row numbers are 1-based and
 * count the header as row 1, so the first data row is row 2. A row with any
 * invalid cell is skipped and reported; the other rows still import.
 */
export function planImport(
  rows: string[][],
  members: ImportMember[],
  existing: { id: string; title: string }[],
): ImportPlan {
  if (rows.length === 0) throw new ImportError("missing_header", "The CSV needs a header row.");
  const cols = mapHeader(rows[0]);
  if (cols.workstream === undefined) {
    throw new ImportError("missing_workstream_column", 'The CSV needs a "workstream" column.');
  }
  const dataRows = rows.length - 1;
  if (dataRows > MAX_IMPORT_ROWS) {
    throw new ImportError("too_many_rows", `At most ${MAX_IMPORT_ROWS} rows can be imported at once.`);
  }

  const existingByKey = new Map(existing.map((w) => [titleKey(w.title), w.id]));
  const planned = new Map<string, PlannedWorkstream>();
  const errors: ImportPlan["errors"] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const rowNo = i + 1;
    const cell = (c: Column) => {
      const idx = cols[c];
      return idx === undefined ? "" : (r[idx] ?? "").trim();
    };
    const wsTitle = cell("workstream").replace(/\s+/g, " ");
    if (!wsTitle) {
      if (r.every((v) => v.trim() === "")) continue;
      errors.push({ row: rowNo, message: "workstream is required" });
      continue;
    }
    try {
      const taskTitle = cell("task");
      const dueDate = parseDue(cell("due"));
      const priority = parsePriority(cell("priority"));
      const status = parseStatus(cell("status"));
      const owner = parseOwner(cell("owner"), members);
      const link = cell("link");
      if (link && !isHttpUrl(link)) throw new Error("link must start with http:// or https://");
      if (wsTitle.length > 200) throw new Error("workstream title is too long (max 200)");
      if (taskTitle.length > 500) throw new Error("task title is too long (max 500)");
      if (!taskTitle && dueDate) throw new Error("due date given without a task");

      const key = titleKey(wsTitle);
      let ws = planned.get(key);
      if (!ws) {
        ws = { title: wsTitle, existingId: existingByKey.get(key) ?? null, notes: [], links: [], tasks: [] };
        planned.set(key, ws);
      }
      const nextStep = cell("nextStep");
      if (nextStep) ws.nextStep = nextStep;
      const notes = cell("notes");

      if (taskTitle) {
        ws.tasks.push({
          row: rowNo,
          title: taskTitle,
          notes: notes || null,
          dueDate,
          priority,
          status,
          assigneeId: owner,
          links: link ? [link] : [],
        });
      } else {
        if (notes) ws.notes.push(notes);
        if (link) ws.links.push(link);
        if (cell("priority")) ws.priority = priority;
        if (cell("owner")) ws.ownerId = owner;
      }
    } catch (err) {
      errors.push({ row: rowNo, message: (err as Error).message });
    }
  }

  const workstreams = [...planned.values()];
  return {
    workstreams,
    errors,
    counts: {
      workstreamsCreated: workstreams.filter((w) => w.existingId === null).length,
      tasksCreated: workstreams.reduce((n, w) => n + w.tasks.length, 0),
      linksCreated: workstreams.reduce((n, w) => n + w.links.length + w.tasks.reduce((m, t) => m + t.links.length, 0), 0),
    },
  };
}
