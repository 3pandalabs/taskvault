import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TaskVault",
    short_name: "TaskVault",
    description: "Household life admin: what's next, deadlines, docs and reminders.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#09090b",
    background_color: "#09090b",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
