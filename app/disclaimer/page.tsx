import type { Metadata } from 'next';
import { safetyFacts } from '@/lib/safety-facts';

export const metadata: Metadata = { title: 'Food safety and liability' };

export default function DisclaimerPage() {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold">Food safety and liability</h1>
        <p className="text-lg text-muted">
          FeedForward connects food donors with organizations that can use their surplus. We do not
          collect, store, inspect, or transport food ourselves.
        </p>
      </div>

      <section aria-labelledby="effort-h" className="flex flex-col gap-3">
        <h2 id="effort-h" className="font-display text-2xl font-semibold">
          Our commitment
        </h2>
        <p>
          Every effort is made by our donors and the FeedForward team to ensure that each donation
          matches the condition and tier it is listed with, and that every donation is made in good
          faith with the best intentions.
        </p>
        <p>
          When a donor describes their surplus, AI drafts the listing and food-safety rules suggest a
          tier. The donor then reviews, corrects, and confirms every item before it is posted. Tiers
          are suggestions to help route food to its best use. They are not inspections or guarantees.
        </p>
      </section>

      <section aria-labelledby="recipients-h" className="flex flex-col gap-3">
        <h2 id="recipients-h" className="font-display text-2xl font-semibold">
          For recipients
        </h2>
        <p>
          Please inspect all food at pickup. You may refuse anything that does not look, smell, or
          feel right, or that does not meet your own organization&apos;s standards.
        </p>
      </section>

      <section aria-labelledby="law-h" className="flex flex-col gap-4">
        <h2 id="law-h" className="font-display text-2xl font-semibold">
          The rules we follow
        </h2>
        <ul className="flex flex-col gap-4">
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
      </section>

      <section aria-labelledby="notice-h" className="flex flex-col gap-3 rounded-2xl border border-warn-line bg-warn-tint p-5 text-warn-text">
        <h2 id="notice-h" className="font-display text-xl font-semibold">
          Please note
        </h2>
        <p>
          This page is general information, not legal advice. Food donation laws vary by state.
          Donors and recipients should consult their own legal counsel or local health department
          with specific questions.
        </p>
        <p>
          FeedForward is a prototype built for HackTN 2026. The organizations, contacts, and numbers
          shown in the demo are fictional.
        </p>
      </section>
    </main>
  );
}