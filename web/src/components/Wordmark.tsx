import Link from "next/link";

// Same treatment as AdVault's Wordmark.tsx (from 3pandalabs/brand attribution/):
// "Task" in the foreground colour, "Vault" in the brand gold, then a hairline
// divider and the "by 3PandaLabs" tag as a sibling link, never nested.

/** TaskVault app icon (same artwork as the favicon, src/app/icon.svg).
 * aria-hidden: the wordmark beside it carries the name. */
export function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimisation needed
    <img src="/icon.svg" alt="" aria-hidden="true" width={28} height={28} className="size-7 shrink-0 rounded-md" />
  );
}

export function WordmarkName() {
  return (
    <>
      Task<span className="text-brand">Vault</span>
    </>
  );
}

/** "| by 3PandaLabs" attribution tag (brand/attribution). A sibling of the home
 * link, never nested inside it. */
export function WordmarkTag({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span aria-hidden className="mx-2 inline-block h-3.5 w-px translate-y-[1px] bg-current align-middle opacity-20" />
      <a
        href="https://3pandalabs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="align-middle font-mono text-[10px] font-normal tracking-widest text-zinc-500 hover:text-zinc-300 hover:underline"
      >
        by 3PandaLabs
      </a>
    </span>
  );
}

/** Header logo: mark + name linking home, attribution as a sibling. */
export function Logo({ href = "/", tagClassName }: { href?: string; tagClassName?: string }) {
  return (
    <span className="inline-flex items-center text-lg font-semibold tracking-tight">
      <Link href={href} className="inline-flex min-h-11 items-center gap-2 text-zinc-100">
        <BrandMark />
        <span>
          <WordmarkName />
        </span>
      </Link>
      <WordmarkTag className={tagClassName} />
    </span>
  );
}
