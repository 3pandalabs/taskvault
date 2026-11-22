import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { SITE_URL } from "@/lib/site";

const TITLE = "TaskVault — A private household tracker for life admin | by 3PandaLabs";
const DESCRIPTION = "A private household tracker for life admin: workstreams, deadlines, docs and reminders.";

// Private app: every page is noindex (robots.txt also disallows everything).
// The share tags are still set so a link pasted into a chat previews properly;
// they don't make anything indexable.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Home "<App> — <line> | by 3PandaLabs"; every other page "<Page> — TaskVault".
  title: { default: TITLE, template: "%s — TaskVault" },
  description: DESCRIPTION,
  applicationName: "TaskVault",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "TaskVault by 3PandaLabs",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TaskVault — A private household tracker for life admin" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
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
