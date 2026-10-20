import Link from 'next/link';
import type { SurveyKind } from '@/lib/surveys';

const copy = {
  donor: {
    heading: 'That’s how donating would work for your kitchen.',
    body: 'Would your restaurant use FeedForward? A 7-minute survey tells us what would make it work for you.',
    action: 'Take the restaurant survey',
  },
  recipient: {
    heading: 'That’s how claiming food would work for your organization.',
    body: 'Would FeedForward help you get more food? A 5-minute survey tells us what you can accept and pick up.',
    action: 'Take the recipient survey',
  },
};

// Shown after a demo visitor finishes something, inviting them to the matching survey
export default function SurveyPrompt({ kind }: { kind: SurveyKind }) {
  const text = copy[kind];
  const headingId = `survey-prompt-${kind}`;

  return (
    <aside
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id={headingId} className="font-display text-lg font-semibold">
          {text.heading}
        </h2>
        <p className="text-muted">{text.body}</p>
      </div>
      <Link
        href={`/survey/${kind}?src=demo`}
        className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-brand px-5 font-bold text-white"
      >
        {text.action}
      </Link>
    </aside>
  );
}