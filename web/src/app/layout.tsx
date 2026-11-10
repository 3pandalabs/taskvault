import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { SITE_URL } from "@/lib/site";

// Private app: every page is noindex (robots.txt also disallows everything).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TaskVault", template: "%s · TaskVault" },
  description: "A private household tracker for life admin: workstreams, deadlines, docs and reminders.",
  applicationName: "TaskVault",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "TaskVault", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  // zinc-950, AdVault's chrome. Dark-only (see globals.css), so one value.
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Same body treatment as AdVault's root layout. The fonts come from the
// globals.css stack (Inter, falling back to the system UI font), as in AdVault.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
