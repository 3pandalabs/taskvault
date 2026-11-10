import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

// Every signed-in surface is noindex (the root layout says so too).
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
