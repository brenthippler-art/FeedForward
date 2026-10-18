import type { Tier } from '@/types';

const tierStyles: Record<Tier, { label: string; className: string }> = {
  1: { label: 'Tier 1 · People', className: 'bg-tier1-tint text-tier1-text' },
  2: { label: 'Tier 2 · Animals', className: 'bg-tier2-tint text-tier2-text' },
  3: { label: 'Tier 3 · Compost', className: 'bg-tier3-tint text-tier3-text' },
};

export default function TierBadge({ tier }: { tier: Tier }) {
  const style = tierStyles[tier];
  return (
    <span className={`w-fit rounded-full px-3 py-1 text-sm font-bold ${style.className}`}>
      {style.label}
    </span>
  );
}