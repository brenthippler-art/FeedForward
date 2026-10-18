import type { Stat } from '@/lib/impact-stats';

type StatBlockProps = {
  stat: Stat;
  tone?: 'light' | 'dark';
};

export default function StatBlock({ stat, tone = 'light' }: StatBlockProps) {
  const dark = tone === 'dark';

  return (
    <div className="flex flex-col gap-1.5">
      <p className="flex flex-col gap-1">
        <span
          className={`font-display text-4xl font-bold tabular-nums ${dark ? 'text-white' : 'text-brand-dark'}`}
        >
          {stat.value}
        </span>
        <span className={dark ? 'text-white' : 'text-ink'}>{stat.label}</span>
      </p>
      <a
        href={stat.source.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`self-start text-sm underline ${dark ? 'text-white/85 hover:text-white' : 'text-muted hover:text-brand'}`}
      >
        {stat.source.name}, {stat.source.year}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}