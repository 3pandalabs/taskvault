// Calendar-date and timezone helpers. Pure: no env/db imports.
//
// Dates are "YYYY-MM-DD" strings (calendar dates, no time). "Today" is always
// relative to a user's IANA timezone, computed with Intl.DateTimeFormat, so
// DST and far-from-UTC zones (Asia/Kolkata, Pacific/Kiritimati) are handled by
// the platform's tz database rather than by offset arithmetic.

const DAY_MS = 86_400_000;
const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Local calendar date + hour (0-23) + minute of `now` in `timeZone`. */
export function localParts(now: Date, timeZone: string): { date: string; hour: number; minute: number } {
  const parts = formatter(timeZone).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  // Some engines render midnight as "24" even with h23; normalise.
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour, minute: Number(get("minute")) };
}

export function localDate(now: Date, timeZone: string): string {
  return localParts(now, timeZone).date;
}

export function localHour(now: Date, timeZone: string): number {
  return localParts(now, timeZone).hour;
}

/** Validates a real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export function isYmd(s: string): boolean {
  const m = YMD.exec(s);
  if (!m) return false;
  return isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function isRealDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function ymd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toUtcMs(date: string): number {
  const m = YMD.exec(date);
  if (!m) throw new Error(`not a YYYY-MM-DD date: ${date}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** date + n calendar days. */
export function addDays(date: string, n: number): string {
  const d = new Date(toUtcMs(date) + n * DAY_MS);
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Whole calendar days from `from` to `to` (to - from); negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}
