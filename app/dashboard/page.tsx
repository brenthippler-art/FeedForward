import type { Metadata } from 'next';
import StatTile from '@/components/StatTile';
import TierBars from '@/components/TierBars';
import TierBadge from '@/components/TierBadge';
import CopyButton from '@/components/CopyButton';
import { getCurrentUser } from '@/lib/session';
import { mockImpactFor, mockImpactSummary } from '@/lib/mock';

export const metadata: Metadata = { title: 'Impact' };

const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // TODO: replace with GET /api/impact?orgId=${user?.orgId}
  const impact = mockImpactFor(user);
  const summary = mockImpactSummary(impact, user);
  const viewerName = user?.name ?? 'All of FeedForward';
  const isRecipient = user?.role === 'recipient';

  return (
    <main id="main" className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-14 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[15px] text-muted">{viewerName} · this month</p>
          <h1 className="font-display text-[34px] font-bold">Impact</h1>
        </div>
        <span className="rounded-full bg-warn-tint px-3 py-1.5 text-sm font-bold text-warn-text">
          Sample data for the demo
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <StatTile
          label={isRecipient ? 'Pounds received' : 'Pounds diverted'}
          value={impact.totalLbs.toLocaleString('en-US')}
          note="Measured at pickup"
        />
        <StatTile
          label="Meals provided (est.)"
          value={impact.meals > 0 ? impact.meals.toLocaleString('en-US') : '—'}
          note="From Tier 1 pounds"
        />
        <StatTile
          label="Pickups completed"
          value={impact.pickups.toLocaleString('en-US')}
          note="Logged at pickup"
        />
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="tier-heading"
          className="flex min-w-0 flex-[3_1_520px] flex-col gap-4 rounded-2xl border border-line bg-surface p-6"
        >
          <h2 id="tier-heading" className="font-display text-xl font-semibold">
            Pounds by tier
          </h2>
          <TierBars lbsByTier={impact.lbsByTier} />
          <p className="text-sm text-muted">Pounds, this month</p>
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
          <CopyButton text={summary} />
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
                <th scope="col" className="border-b border-line px-3 py-2.5">
                  {isRecipient ? 'Donor' : 'Recipient'}
                </th>
                <th scope="col" className="border-b border-line px-3 py-2.5">Tier</th>
                <th scope="col" className="border-b border-line px-3 py-2.5 text-right">Lbs</th>
              </tr>
            </thead>
            <tbody>
              {impact.recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted">
                    No pickups logged yet this month.
                  </td>
                </tr>
              ) : (
                impact.recent.map((row) => (
                  <tr key={row.pickupId} className="border-b border-[#ECEEE8] last:border-0">
                    <td className="px-3 py-3">{dateFormat.format(new Date(row.date))}</td>
                    <td className="px-3 py-3">{row.item}</td>
                    <td className="px-3 py-3">
                      {isRecipient ? row.donorName : row.recipientName}
                    </td>
                    <td className="px-3 py-3"><TierBadge tier={row.tier} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">{row.lbs}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}