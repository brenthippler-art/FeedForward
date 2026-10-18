import type { PullQuoteData } from '@/lib/impact-stats';

type PullQuoteProps = {
  data: PullQuoteData;
};

export default function PullQuote({ data }: PullQuoteProps) {
  return (
    <figure className="mx-auto flex max-w-3xl flex-col gap-4 border-l-4 border-brand py-2 pl-6 md:pl-8">
      <blockquote cite={data.source.href}>
        <p className="font-display text-2xl font-semibold leading-snug text-ink md:text-3xl">
          <span aria-hidden="true">“</span>
          {data.quote}
          <span aria-hidden="true">”</span>
        </p>
      </blockquote>
      <figcaption className="flex flex-col gap-0.5 text-muted">
        <span className="font-bold text-ink">{data.name}</span>
        <span>{data.role}</span>
        <a
          href={data.source.href}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm underline hover:text-brand"
        >
          {data.source.name}, {data.source.year}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  );
}