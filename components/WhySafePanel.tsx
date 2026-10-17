import Link from 'next/link';
import { safetyFacts } from '@/lib/safety-facts';

export default function WhySafePanel() {
  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-6 py-4 font-display text-xl font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        Why it&apos;s safe to donate
        <span
          aria-hidden="true"
          className="text-brand transition-transform group-open:rotate-180 motion-reduce:transition-none"
        >
          ▾
        </span>
      </summary>

      <div className="flex flex-col gap-5 border-t border-line px-6 py-5">
        <ul className="flex flex-col gap-5">
          {safetyFacts.map((fact) => (
            <li key={fact.title} className="flex flex-col gap-1">
              <h3 className="font-bold">{fact.title}</h3>
              <p className="text-muted">{fact.body}</p>
              <a
                href={fact.source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start font-semibold text-brand underline hover:text-brand-dark"
              >
                {fact.source.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          General information, not legal advice.{' '}
          <Link href="/disclaimer" className="font-semibold text-brand underline hover:text-brand-dark">
            Read our food safety and liability notice
          </Link>
          .
        </p>
      </div>
    </details>
  );
}