"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorText, Field, Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, login } from "@/lib/api";
import { useAction, useNextPath } from "@/lib/hooks";
import { useSignedIn } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const next = useNextPath();
  const signedIn = useSignedIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useAction();

  // Already signed in (or just signed in): go where we were headed.
  useEffect(() => {
    if (signedIn) router.replace(next ?? "/");
  }, [signedIn, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await run(() => login({ email: email.trim(), password }), errorMessage);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-fg-muted">Your household&apos;s life admin, in one place.</p>
      </div>
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        Sign in
      </Button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-amber-300 hover:underline">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
