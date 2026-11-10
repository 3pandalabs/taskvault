// Small RFC 4180 CSV parser. Pure: no env/db imports.
//
// Handles quoted fields with commas, doubled quotes ("") and embedded
// newlines; CRLF, LF or CR line endings; a leading UTF-8 BOM (Excel/Sheets
// exports). Fully blank lines are dropped. An unterminated quote is an error.

export class CsvError extends Error {}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false; // the current field had a quote, so "" is a value
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"' && field === "" && !fieldStarted) {
      inQuotes = true;
      fieldStarted = true;
      i++;
    } else if (c === ",") {
      endField();
      i++;
    } else if (c === "\r" || c === "\n") {
      endRow();
      i += c === "\r" && text[i + 1] === "\n" ? 2 : 1;
    } else {
      // Lenient: a quote in the middle of an unquoted field is kept literally.
      field += c;
      i++;
    }
  }
  if (inQuotes) throw new CsvError("unterminated quoted field");
  if (field !== "" || fieldStarted || row.length > 0) endRow();
  return rows;
}
