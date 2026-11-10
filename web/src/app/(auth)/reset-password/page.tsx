"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ErrorText, Field, Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage, confirmPasswordReset } from "@/lib/api";
import { useAction } from "@/lib/hooks";

const noop = () => () => undefined;

/** Read ?token= without useSearchParams (no Suspense boundary needed). */
function useToken() {
  return useSyncExternalStore(
    noop,
    () => new URLSearchParams(window.location.search).get("token"),
    () => undefined,
  );
}

export default function ResetPasswordPage() {
  const token = useToken();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const { busy, error, setError, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The two passwords don't match.");
    const ok = await run(
      () => confirmPasswordReset(token ?? "", password),
      (err) =>
        err instanceof ApiError && err.status === 400
          ? "This reset link is invalid or has expired. Request a new one."
          : errorMessage(err),
    );
    if (ok) setDone(true);
  }

  if (token === undefined) return <div className="h-64" aria-busy />;

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Link incomplete</h1>
        <p className="text-sm text-fg-muted">This reset link is missing its token. Request a fresh one.</p>
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm text-amber-300 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="text-xl font-semibold">Password updated</h1>
        <p className="text-sm text-fg-muted">Sign in with your new password.</p>
        <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-amber-300 hover:underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <Field label="New password" htmlFor="pw" hint="At least 8 characters.">
        <Input
          id="pw"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="pw2">
        <Input
          id="pw2"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        Set password
      </Button>
    </form>
  );
}
