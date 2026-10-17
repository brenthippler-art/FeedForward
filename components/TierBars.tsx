import type { Tier } from '@/types';

const tiers: { tier: Tier; label: string; barClass: string }[] = [
  { tier: 1, label: 'Tier 1 · People', barClass: 'bg-tier1' },
  { tier: 2, label: 'Tier 2 · Animals', barClass: 'bg-tier2' },
  { tier: 3, label: 'Tier 3 · Compost', barClass: 'bg-tier3' },
];

export default function TierBars({ lbsByTier }: { lbsByTier: Record<Tier, number> }) {
  const max = Math.max(...tiers.map((t) => lbsByTier[t.tier]), 1);
  const summary = tiers.map((t) => `${t.label}: ${lbsByTier[t.tier]} lbs`).join(', ');

  return (
    <figure className="m-0 flex flex-col gap-3.5">
      <div role="img" aria-label={`Pounds by tier. ${summary}`} className="flex flex-col gap-3.5">
        {tiers.map((t) => {
          const lbs = lbsByTier[t.tier];
          return (
            <div key={t.tier} className="grid grid-cols-[150px_minmax(0,1fr)_64px] items-center gap-3">
              <span className="text-[15px] font-bold">{t.label}</span>
              <div className="h-5 rounded-r bg-ground">
                <div
                  className={`h-5 rounded-r ${t.barClass}`}
                  style={{ width: `${(lbs / max) * 100}%` }}
                />
              </div>
              <span className="text-right font-bold tabular-nums">{lbs.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="text-sm text-muted">Pounds diverted this month</figcaption>
    </figure>
  );
}