import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted">
        <p>FeedForward · Built at HackTN 2026 · Demo with sample data</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5">
          <Link
            href="/survey"
            className="inline-block py-1 font-semibold text-brand underline hover:text-brand-dark"
          >
            Take the survey
          </Link>
          <Link
            href="/disclaimer"
            className="inline-block py-1 font-semibold text-brand underline hover:text-brand-dark"
          >
            Food safety &amp; liability
          </Link>
        </nav>
      </div>
    </footer>
  );
}
