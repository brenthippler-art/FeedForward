import StatBlock from '@/components/StatBlock';
import TierBadge from '@/components/TierBadge';
import { landfillStats } from '@/lib/impact-stats';
import type { Tier } from '@/types';

const tiers: { tier: Tier; title: string; body: string; who: string }[] = [
  {
    tier: 1,
    title: 'People first',
    body: 'Safe, edible surplus goes to food pantries, shelters, and meal programs.',
    who: 'Pantries, shelter kitchens, meal programs',
  },
  {
    tier: 2,
    title: 'Then farms',
    body: 'Plant-based scraps that never touched meat become feed for goats, chickens, and other livestock.',
    who: 'Local livestock farms (never pigs, per KY and TN law)',
  },
  {
    tier: 3,
    title: 'Then compost',
    body: 'Whatever is left becomes compost that builds healthy soil, instead of going to the landfill.',
    who: 'Compost sites and community gardens',
  },
];

export default function BestUse() {
  return (
    <section aria-labelledby="tiers-heading" className="border-y border-line bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-14">
        <div className="flex max-w-3xl flex-col gap-3">
          <h2 id="tiers-heading" className="font-display text-[28px] font-bold">
            Every pound goes to the best use it&apos;s still good for
          </h2>
          <p className="text-lg text-muted">
            FeedForward follows the EPA&apos;s{' '}
            <a
              href="https://epa.gov/sustainable-management-food/wasted-food-scale"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand underline hover:text-brand-dark"
            >
              Wasted Food Scale
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            , which ranks what to do with surplus food from best to worst.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {tiers.map((t) => (
            <li key={t.tier} className="flex flex-col gap-3 rounded-2xl border border-line p-6">
              <div>
                <TierBadge tier={t.tier} />
              </div>
              <h3 className="font-display text-xl font-semibold">{t.title}</h3>
              <p className="text-muted">{t.body}</p>
              <p className="mt-auto border-t border-line pt-3 text-sm">
                <span className="font-bold">Goes to: </span>
                {t.who}
              </p>
            </li>
          ))}
        </ol>

        <div className="grid gap-6 rounded-2xl border border-dashed border-field p-6 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
          <div className="flex flex-col gap-2">
            <h3 className="font-display text-xl font-semibold">The landfill is the last resort</h3>
            <p className="text-muted">
              Food buried in a landfill doesn&apos;t just go to waste. It rots and releases methane,
              and Nashville&apos;s main landfill is running out of room.
            </p>
          </div>
          {landfillStats.map((stat) => (
            <StatBlock key={stat.value} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}