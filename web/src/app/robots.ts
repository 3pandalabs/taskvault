import type { MetadataRoute } from "next";

// Private household app: nothing here is meant to be indexed. Pages also send
// `robots: { index: false }` from the root layout, which is the stronger signal.
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
