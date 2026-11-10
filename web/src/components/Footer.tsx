// Canonical org footer, copied from 3pandalabs/brand `footer/` — the same
// two-span row AdVault, RentVault, RsvpVault and MealMargin render. Do not
// reword. Private app: no legal-links row (AdVault's is an AdVault-only
// addition for the Google Ads review). The link back to 3pandalabs.com lives in
// the wordmark's attribution tag, as in the other apps.
export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
        <span>&copy; 3PandaLabs LLC, USA.</span>
        <span>All rights reserved.</span>
      </div>
    </footer>
  );
}
