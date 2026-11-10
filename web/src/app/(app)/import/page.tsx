"use client";

import { CheckCircle2, FileUp, Info } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { ErrorText, Panel, Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { errorMessage, importCsv } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import type { ImportResult } from "@/lib/types";

// Recognised columns, from api/ROUTES.md "Import".
const COLUMNS: { name: string; help: string }[] = [
  { name: "workstream", help: "Required. Rows with the same name are grouped; an existing workstream with that name is reused." },
  { name: "task", help: "Task title. Leave blank to only set the workstream's next step / notes / link." },
  { name: "due", help: "YYYY-MM-DD, M/D/YYYY or D-Mon-YYYY." },
  { name: "priority", help: "high / medium / low (or h / m / l). Default medium." },
  { name: "status", help: "open or done (done, complete, yes, x all count as done)." },
  { name: "owner", help: "A household member's name. Blank or “both” = both of you." },
  { name: "next step", help: "The workstream's one next thing to do." },
  { name: "notes", help: "Free text." },
  { name: "link / url", help: "A doc link (http/https)." },
];

const SAMPLE = `workstream,task,due,priority,owner,next step,link
Car insurance,Compare quotes,2026-12-01,high,,Call the broker,
Car insurance,Renew policy,2026-12-15,high,,,https://drive.google.com/...`;

export default function ImportPage() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ csv: string; result: ImportResult } | null>(null);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const check = useAction();
  const commit = useAction();

  const previewFresh = preview && preview.csv === csv;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5_000_000) return check.setError("That file is too big. Export just the sheet you need as CSV.");
    setCsv(await f.text());
    setFileName(f.name);
    setPreview(null);
    setImported(null);
  }

  async function runPreview() {
    if (!csv.trim()) return check.setError("Paste your CSV or choose a file first.");
    setImported(null);
    await check.run(async () => setPreview({ csv, result: await importCsv(csv, true) }), errorMessage);
  }

  async function runImport() {
    await commit.run(async () => {
      setImported(await importCsv(csv, false));
      setPreview(null);
    }, errorMessage);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Import from a spreadsheet</h1>
        <p className="mt-1 text-sm text-fg-muted">
          In Google Sheets: File → Download → Comma-separated values (.csv). Then choose the file or paste its contents.
          Preview first; nothing is saved until you press Import.
        </p>
      </header>

      {imported ? (
        <Panel className="space-y-3 border-accent/40">
          <p className="flex items-center gap-2 font-semibold text-fg">
            <CheckCircle2 className="size-5 text-accent" aria-hidden />
            Imported
          </p>
          <Counts r={imported} />
          {imported.errors.length ? <RowErrors r={imported} note="These rows were skipped:" /> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/" className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-fg">
              See Today
            </Link>
            <Link href="/workstreams" className="inline-flex h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium">
              Workstreams
            </Link>
          </div>
        </Panel>
      ) : null}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" id="csv-file" onChange={onFile} />
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <FileUp />
            Choose .csv file
          </Button>
          {fileName ? <span className="truncate text-sm text-fg-muted">{fileName}</span> : null}
        </div>
        <label htmlFor="csv-text" className="block text-sm font-medium">
          …or paste CSV
        </label>
        <Textarea
          id="csv-text"
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setFileName(null);
          }}
          rows={8}
          spellCheck={false}
          placeholder={SAMPLE}
          className="font-mono text-xs md:text-xs"
        />
        <ErrorText>{check.error || commit.error}</ErrorText>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant={previewFresh ? "outline" : "default"} onClick={runPreview} disabled={check.busy || !csv.trim()}>
            {check.busy ? <Spinner /> : null}
            Preview
          </Button>
          <Button
            onClick={runImport}
            disabled={!previewFresh || commit.busy || !!(preview && nothingToImport(preview.result))}
            title={!previewFresh ? "Preview first" : undefined}
          >
            {commit.busy ? <Spinner /> : null}
            Import
          </Button>
        </div>
      </Panel>

      {previewFresh && preview ? (
        <Panel className="space-y-3">
          <p className="font-semibold">Preview</p>
          <Counts r={preview.result} future />
          {preview.result.errors.length ? (
            <RowErrors r={preview.result} note="These rows have problems and will be skipped. Fix them in the CSV and preview again, or import the rest." />
          ) : (
            <p className="text-sm text-fg-muted">No problems found.</p>
          )}
        </Panel>
      ) : null}

      <Panel className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Info className="size-4 text-fg-muted" aria-hidden />
          Recognised columns
        </p>
        <p className="text-sm text-fg-muted">The first row must be headers. Names aren&apos;t case-sensitive; other columns are ignored. Up to 2,000 rows.</p>
        <dl className="divide-y divide-line text-sm">
          {COLUMNS.map((c) => (
            <div key={c.name} className="grid gap-1 py-2 sm:grid-cols-[8rem_1fr]">
              <dt>
                <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">{c.name}</code>
              </dt>
              <dd className="text-fg-muted">{c.help}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}

function nothingToImport(r: ImportResult) {
  return r.workstreamsCreated + r.tasksCreated + r.linksCreated === 0 && r.errors.length > 0;
}

function Counts({ r, future }: { r: ImportResult; future?: boolean }) {
  const items = [
    { n: r.workstreamsCreated, label: "new workstreams" },
    { n: r.tasksCreated, label: "tasks" },
    { n: r.linksCreated, label: "links" },
  ];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl bg-surface-2 px-3 py-2 text-center">
            <div className="text-xl font-semibold tabular-nums">{i.n}</div>
            <div className="text-xs text-fg-muted">{i.label}</div>
          </div>
        ))}
      </div>
      {future ? <p className="mt-2 text-xs text-fg-muted">Rows for workstreams you already have are added to them.</p> : null}
    </div>
  );
}

function RowErrors({ r, note }: { r: ImportResult; note: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-danger">
        {r.errors.length} row{r.errors.length === 1 ? "" : "s"} with problems. {note}
      </p>
      <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl bg-danger-soft p-3 text-sm">
        {r.errors.map((e, i) => (
          <li key={`${e.row}-${i}`}>
            <span className="font-medium">Row {e.row}:</span> {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
