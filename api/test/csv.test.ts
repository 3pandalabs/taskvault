import { describe, expect, it } from "vitest";
import { CsvError, parseCsv } from "../src/lib/csv.js";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas, doubled quotes and newlines", () => {
    const csv = 'workstream,notes\r\n"EB5, round 2","He said ""wait""\nthen call"\r\nCar,plain\r\n';
    expect(parseCsv(csv)).toEqual([
      ["workstream", "notes"],
      ["EB5, round 2", 'He said "wait"\nthen call'],
      ["Car", "plain"],
    ]);
  });

  it("keeps empty fields, including a quoted empty and trailing empties", () => {
    expect(parseCsv('a,,""\n,,')).toEqual([
      ["a", "", ""],
      ["", "", ""],
    ]);
  });

  it("strips a UTF-8 BOM and drops blank lines; accepts CR-only endings", () => {
    expect(parseCsv("﻿h1,h2\n\n1,2\r\r3,4\n")).toEqual([
      ["h1", "h2"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("throws on an unterminated quote", () => {
    expect(() => parseCsv('a,"oops\n1,2')).toThrow(CsvError);
  });

  it("is lenient about a stray quote inside an unquoted field", () => {
    expect(parseCsv('5" screen,x')).toEqual([['5" screen', "x"]]);
  });
});
