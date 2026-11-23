import Link from "next/link";

// Canonical org footer, copied from 3pandalabs/brand `footer/` — the same
// two-span row AdVault, RentVault, RsvpVault and MealMargin render. Do not
// reword. Plus a Privacy / Terms row (as AdVault and SpendVault have) so the
// legal pages are one tap away from every page, signed in or not. The link
// back to 3pandalabs.com lives in the wordmark's attribution tag, as in the
// other apps.
export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>&copy; 3PandaLabs LLC, USA.</span>
        <span>All rights reserved.</span>
        <nav aria-label="Legal" className="flex basis-full gap-4">
          <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-zinc-300 hover:underline">
            Privacy
          </Link>
          <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-zinc-300 hover:underline">
            Terms
          </Link>
        </nav>
        <p className="mt-1 basis-full text-xs text-zinc-500">Built by pandas. Loved by people.</p>
      </div>
    </footer>
  );
}
