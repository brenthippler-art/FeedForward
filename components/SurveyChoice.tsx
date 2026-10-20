'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const choices = [
  {
    href: '/survey/donor',
    title: 'I have surplus food',
    body: 'For restaurants, caterers, cafeterias and other kitchens. About 7 minutes.',
  },
  {
    href: '/survey/recipient',
    title: 'I receive or collect food',
    body: 'For pantries, shelters, meal programs, farms and compost sites. About 5 minutes.',
  },
];

// The two survey cards. `query` carries a tag like ?src=card through to the survey.
export function SurveyChoiceLinks({ query = '' }: { query?: string }) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {choices.map((choice) => (
        <li key={choice.href}>
          <Link
            href={`${choice.href}${query}`}
            className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-6 hover:border-brand"
          >
            <span className="font-display text-xl font-semibold">{choice.title}</span>
            <span className="text-muted">{choice.body}</span>
            <span className="mt-auto pt-2 font-bold text-brand">Start this survey →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SurveyChoice() {
  const source = useSearchParams().get('src');
  return <SurveyChoiceLinks query={source ? `?src=${encodeURIComponent(source)}` : ''} />;
}