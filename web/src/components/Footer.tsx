// Sitewide footer, copy from brand/footer/footer.css. Private app: no legal links.
export function Footer() {
  return (
    <footer className="border-t border-line px-4 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>&copy; 3PandaLabs LLC, USA.</span>
        <span>
          TaskVault{" "}
          <a href="https://3pandalabs.com" target="_blank" rel="noopener noreferrer" className="hover:text-fg hover:underline">
            by 3PandaLabs
          </a>
        </span>
      </div>
    </footer>
  );
}
