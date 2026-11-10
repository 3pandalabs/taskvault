"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ErrorText, Field, Spinner } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, requestPasswordReset } from "@/lib/api";
import { useAction } from "@/lib/hooks";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const { busy, error, run } = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await run(() => requestPasswordReset(email.trim()), errorMessage)) setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <MailCheck className="mx-auto size-10 text-accent" aria-hidden />
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="text-sm text-fg-muted">
          If <strong className="text-fg">{email.trim()}</strong> has an account, a reset link is on its way. It works for
          one hour.
        </p>
        <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-amber-300 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-fg-muted">We&apos;ll email you a link to choose a new one.</p>
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
      <ErrorText>{error}</ErrorText>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : null}
        Send reset link
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="inline-flex min-h-11 items-center text-amber-300 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
