import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/RegisterSW";
import { geistSans } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";

// Private app: every page is noindex (robots.txt also disallows everything).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TaskVault", template: "%s · TaskVault" },
  description: "A private household tracker for life admin: workstreams, deadlines, docs and reminders.",
  applicationName: "TaskVault",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "TaskVault", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1113" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`min-h-screen antialiased ${geistSans.variable}`}>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
