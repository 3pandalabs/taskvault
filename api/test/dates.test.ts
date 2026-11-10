import { describe, expect, it } from "vitest";
import { addDays, daysBetween, isValidTimeZone, isYmd, localDate, localHour, localParts } from "../src/lib/dates.js";

describe("localDate / localHour", () => {
  // 2026-11-10 03:30 UTC
  const t = new Date("2026-11-10T03:30:00Z");

  it("is still the previous day in New York", () => {
    expect(localDate(t, "America/New_York")).toBe("2026-11-09");
    expect(localHour(t, "America/New_York")).toBe(22);
  });

  it("is already the next morning in India (UTC+5:30)", () => {
    expect(localDate(t, "Asia/Kolkata")).toBe("2026-11-10");
    expect(localParts(t, "Asia/Kolkata")).toMatchObject({ hour: 9, minute: 0 });
  });

  it("handles UTC and far-east zones", () => {
    expect(localDate(t, "UTC")).toBe("2026-11-10");
    expect(localDate(new Date("2026-11-09T11:00:00Z"), "Pacific/Kiritimati")).toBe("2026-11-10"); // UTC+14
  });

  it("reports midnight as hour 0, not 24", () => {
    expect(localHour(new Date("2026-11-10T05:00:00Z"), "America/New_York")).toBe(0);
  });

  it("follows DST: 2026-03-08 New York springs forward", () => {
    // 06:30 UTC = 01:30 EST (UTC-5); 07:30 UTC = 03:30 EDT (UTC-4)
    expect(localHour(new Date("2026-03-08T06:30:00Z"), "America/New_York")).toBe(1);
    expect(localHour(new Date("2026-03-08T07:30:00Z"), "America/New_York")).toBe(3);
  });

  it("follows DST: 2026-11-01 New York falls back", () => {
    expect(localHour(new Date("2026-11-01T05:30:00Z"), "America/New_York")).toBe(1); // EDT
    expect(localHour(new Date("2026-11-01T06:30:00Z"), "America/New_York")).toBe(1); // EST again
    expect(localDate(new Date("2026-11-01T06:30:00Z"), "America/New_York")).toBe("2026-11-01");
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects junk", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("calendar math", () => {
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-11-09", 7)).toBe("2026-11-16");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-11-09", -10)).toBe("2026-10-30");
  });

  it("counts whole days, unaffected by DST", () => {
    expect(daysBetween("2026-11-09", "2026-11-16")).toBe(7);
    expect(daysBetween("2026-11-09", "2026-11-08")).toBe(-1);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(daysBetween("2026-10-31", "2026-11-02")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });

  it("validates real YYYY-MM-DD dates", () => {
    expect(isYmd("2026-11-09")).toBe(true);
    expect(isYmd("2028-02-29")).toBe(true);
    expect(isYmd("2027-02-29")).toBe(false);
    expect(isYmd("2026-13-01")).toBe(false);
    expect(isYmd("2026-1-1")).toBe(false);
    expect(isYmd("11/09/2026")).toBe(false);
  });
});
