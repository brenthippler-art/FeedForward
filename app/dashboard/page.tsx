import StatTile from '@/components/StatTile';
import TierBars from '@/components/TierBars';
import TierBadge from '@/components/TierBadge';
import CopyButton from '@/components/CopyButton';
import { mockImpact, mockImpactSummary } from '@/lib/mock';

export const metadata = { title: 'Impact' };

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export default function DashboardPage() {
  // TODO: GET /api/impact when the backend is ready
  const impact = mockImpact;
  const summary = mockImpactSummary;

  return (
    <main id="main" className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-14 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] text-muted">Riverside Bistro · this month</p>
          <h1 className="font-display text-[34px] font-bold">Impact</h1>
        </div>
        <span className="rounded-full bg-warn-tint px-3 py-1.5 text-sm font-bold text-warn-text">
          Sample data for the demo
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatTile
          label="Pounds diverted"
          value={impact.totalLbs.toLocaleString()}
          note="Measured at pickup"
        />
        <StatTile
          label="Meals provided (est.)"
          value={impact.meals > 0 ? `≈ ${impact.meals.toLocaleString()}` : '—'}
          note={impact.meals > 0 ? 'From Tier 1 pounds' : 'Waiting on a sourced lbs-per-meal figure'}
        />
        <StatTile
          label="Pickups completed"
          value={impact.pickups.toLocaleString()}
          note="All tiers"
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="tier-heading"
          className="flex min-w-0 flex-[3_1_520px] flex-col gap-4 rounded-2xl border border-line bg-surface p-6"
        >
          <h2 id="tier-heading" className="font-display text-xl font-semibold">
            Most of it fed people
          </h2>
          <TierBars lbsByTier={impact.lbsByTier} />
        </section>

        <section
          aria-labelledby="summary-heading"
          className="flex min-w-0 flex-[2_1_340px] flex-col gap-3 rounded-2xl border border-line bg-surface p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="summary-heading" className="font-display text-xl font-semibold">
              Impact summary
            </h2>
            <span className="text-sm text-muted">Written by AI from your numbers</span>
          </div>
          <p className="text-[17px] leading-relaxed">{summary}</p>
          <div><CopyButton text={summary} /></div>
        </section>
      </div>

      <section
        aria-labelledby="recent-heading"
        className="flex flex-col gap-3.5 rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id="recent-heading" className="font-display text-xl font-semibold">Recent pickups</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr className="text-sm text-muted">
                <th scope="col" className="border-b border-line px-3 py-2.5">Date</th>
                <th scope="col" className="border-b border-line px-3 py-2.5">Item</th>
                <th scope="col" className="border-b border-line px-3 py-2.5">Recipient</th>
                <th scope="col" className="border-b border-line px-3 py-2.5">Tier</th>
                <th scope="col" className="border-b border-line px-3 py-2.5 text-right">Lbs</th>
              </tr>
            </thead>
            <tbody>
              {impact.recent.map((row) => (
                <tr key={row.pickupId} className="border-b border-[#ECEEE8] last:border-0">
                  <td className="px-3 py-3">{dateFormat.format(new Date(row.date))}</td>
                  <td className="px-3 py-3">{row.item}</td>
                  <td className="px-3 py-3">{row.recipientName}</td>
                  <td className="px-3 py-3"><TierBadge tier={row.tier} /></td>
                  <td className="px-3 py-3 text-right tabular-nums">{row.lbs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}