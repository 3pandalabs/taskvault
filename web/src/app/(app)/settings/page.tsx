"use client";

import { LogOut, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ErrorText, Field, Panel, SectionTitle, Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { changePassword, errorMessage, logout, updateMe } from "@/lib/api";
import { useAction } from "@/lib/hooks";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function browserZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
      <ProfileForm />
      <PasswordForm />
      <section>
        <SectionTitle>More</SectionTitle>
        <Panel className="p-0 sm:p-0">
          <Link href="/import" className="flex min-h-14 items-center gap-3 px-4 text-sm hover:bg-surface-2">
            <Upload className="size-4 text-fg-muted" aria-hidden />
            Import from a spreadsheet (CSV)
          </Link>
        </Panel>
      </section>
      <SignOut />
    </div>
  );
}

function ProfileForm() {
  const { user, setUser } = useSession();
  const device = browserZone();
  const zones = useMemo(() => {
    let list: string[] = [];
    try {
      list = Intl.supportedValuesOf("timeZone");
    } catch {
      list = [];
    }
    const set = new Set(list);
    for (const z of [user.timezone, device, "UTC"]) if (z && !set.has(z)) list = [z, ...list];
    return list;
  }, [user.timezone, device]);

  const [name, setName] = useState(user.name);
  // An empty stored zone falls back to the browser's.
  const [timezone, setTimezone] = useState(user.timezone || device);
  const [digest, setDigest] = useState(user.digestEnabled);
  const { busy, error, setError, run } = useAction();
  const dirty = name.trim() !== user.name || timezone !== user.timezone || digest !== user.digestEnabled;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Your name can't be empty.");
    const ok = await run(async () => {
      setUser(await updateMe({ name: name.trim(), timezone, digestEnabled: digest }));
    }, errorMessage);
    if (ok) toast("Settings saved");
  }

  return (
    <section>
      <SectionTitle>Profile &amp; reminders</SectionTitle>
      <Panel>
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-fg-muted">
            Signed in as <span className="text-fg">{user.email}</span>
          </p>
          <Field label="Name" htmlFor="set-name">
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={100} />
          </Field>
          <Field
            label="Time zone"
            htmlFor="set-tz"
            hint={
              timezone !== device ? (
                <>
                  This device is in {device}.{" "}
                  <button type="button" className="text-amber-300 hover:underline" onClick={() => setTimezone(device)}>
                    Use that
                  </button>
                </>
              ) : (
                "Used for Today, due dates and when reminder emails go out."
              )
            }
          >
            <Select id="set-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="digest-label" className="text-sm font-medium">
                Daily digest email
              </p>
              <p id="digest-desc" className="text-xs text-fg-muted">
                One morning email with what&apos;s overdue, due today, this week, and next steps. Task reminders (7 days,
                1 day, due, overdue) are sent either way.
              </p>
            </div>
            <Toggle checked={digest} onChange={setDigest} labelledBy="digest-label" describedBy="digest-desc" />
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !dirty}>
              {busy ? <Spinner /> : null}
              Save
            </Button>
          </div>
        </form>
      </Panel>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className="flex h-11 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full"
    >
      <span className={cn("flex h-7 w-12 items-center rounded-full p-0.5 transition-colors", checked ? "bg-amber-400" : "bg-white/15")}>
        <span
          className={cn(
            "size-6 rounded-full bg-zinc-100 shadow shadow-black/40 transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const { busy, error, setError, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError("Use at least 8 characters for the new password.");
    if (next !== confirm) return setError("The two new passwords don't match.");
    const ok = await run(() => changePassword(current, next), errorMessage);
    if (ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast("Password changed");
    }
  }

  return (
    <section>
      <SectionTitle>Change password</SectionTitle>
      <Panel>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Current password" htmlFor="pw-cur">
            <Input
              id="pw-cur"
              type="password"
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="New password" htmlFor="pw-new" hint="At least 8 characters.">
              <Input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password" htmlFor="pw-new2">
              <Input
                id="pw-new2"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !current || !next}>
              {busy ? <Spinner /> : null}
              Change password
            </Button>
          </div>
        </form>
      </Panel>
    </section>
  );
}

function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex justify-center">
      <Button
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await logout().catch(() => undefined);
          router.replace("/login");
        }}
      >
        {busy ? <Spinner /> : <LogOut />}
        Log out
      </Button>
    </div>
  );
}
