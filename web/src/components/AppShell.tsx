"use client";

import { CalendarCheck, FolderKanban, Plus, Settings, Upload } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { SessionProvider, useSessionLoader, useSignedIn } from "@/lib/session";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Backdrop } from "./Backdrop";
import { LoadError, Loading, Toaster } from "./common";
import { Footer } from "./Footer";
import { QuickAddSheet } from "./QuickAdd";
import { Button } from "./ui/button";
import { Logo } from "./Wordmark";

/** /login that comes back here afterwards (e.g. from a reminder email link). */
function loginUrl() {
  const here = window.location.pathname + window.location.search;
  return here === "/" ? "/login" : `/login?next=${encodeURIComponent(here)}`;
}

const TABS = [
  { href: "/", label: "Today", icon: CalendarCheck, match: (p: string) => p === "/" },
  { href: "/workstreams", label: "Workstreams", icon: FolderKanban, match: (p: string) => p.startsWith("/workstreams") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
];

/**
 * Gate on what renders, NOT a security boundary: every request carries a
 * bearer token the API validates. No middleware/proxy.ts.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const signedIn = useSignedIn();
  const session = useSessionLoader(signedIn);
  const { data, mutate } = session;

  useEffect(() => {
    if (!signedIn) router.replace(loginUrl());
  }, [signedIn, router]);

  useEffect(() => {
    if (session.error instanceof ApiError && session.error.status === 401) router.replace(loginUrl());
  }, [session.error, router]);

  const setUser = useCallback((user: User) => mutate((d) => ({ ...d, user })), [mutate]);

  if (!signedIn) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <Backdrop />
      {data ? (
        <SessionProvider user={data.user} members={data.members} setUser={setUser}>
          <Chrome>{children}</Chrome>
        </SessionProvider>
      ) : (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
          {session.error ? <LoadError error={session.error} onRetry={session.reload} /> : <Loading />}
        </main>
      )}
    </div>
  );
}

function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);

  return (
    <>
      {/* Top bar: full nav on desktop, just the logo on phones. */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/70 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo tagClassName="hidden sm:inline" />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {[...TABS.slice(0, 2), { href: "/import", label: "Import", icon: Upload, match: (p: string) => p === "/import" }, TABS[2]].map(
              (t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  aria-current={t.match(pathname) ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm transition-colors",
                    t.match(pathname) ? "bg-white/10 text-zinc-100" : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100",
                  )}
                >
                  <t.icon className="size-4" aria-hidden />
                  {t.label}
                </Link>
              ),
            )}
            <Button className="ml-2" onClick={() => setAdding(true)}>
              <Plus />
              Add task
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-5 sm:px-6 md:pb-12 md:pt-8">{children}</main>
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <Footer />
      </div>

      {/* Floating quick-add (phones). */}
      <button
        type="button"
        onClick={() => setAdding(true)}
        aria-label="Add a task"
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-14 items-center justify-center rounded-full bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300/40 transition-transform hover:bg-amber-300 active:scale-95 md:hidden"
      >
        <Plus className="size-7" />
      </button>

      {/* Bottom tab bar (phones). */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-3">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-amber-300" : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                <t.icon className="size-6" aria-hidden strokeWidth={active ? 2.25 : 1.75} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickAddSheet open={adding} onClose={() => setAdding(false)} />
      <Toaster />
    </>
  );
}
