import MatchList from '@/components/MatchList';
import TierBadge from '@/components/TierBadge';
import { mockListing, mockMatches } from '@/lib/mock';

export const metadata = { title: 'Suggested recipients' };

const timeFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Chicago',
});

export default function RecipientPage() {
  // TODO: fetch the listing and GET /api/matches?listingId= when the backend is ready
  const listing = mockListing;
  const matches = mockMatches;

  return (
    <main id="main" className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-6 px-6 pb-14 pt-8">
      <aside
        aria-labelledby="listing-heading"
        className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-2xl border border-line bg-surface p-6"
      >
        <p className="text-sm font-bold uppercase tracking-wider text-muted">Listing</p>
        <h2 id="listing-heading" className="font-display text-2xl font-bold">{listing.item}</h2>
        <div><TierBadge tier={listing.tier} /></div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <dt className="text-muted">Quantity</dt>
          <dd className="font-semibold">{listing.quantity} {listing.unit}</dd>
          <dt className="text-muted">Condition</dt>
          <dd className="font-semibold">{listing.condition}</dd>
          <dt className="text-muted">Safe until</dt>
          <dd className="font-semibold">
            {listing.safeUntil ? timeFormat.format(new Date(listing.safeUntil)) : 'Not set'}
          </dd>
        </dl>
        <p className="border-t border-line pt-3 text-sm text-muted">{listing.tierReason}</p>
      </aside>

      <section aria-labelledby="matches-heading" className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
        <h1 id="matches-heading" className="font-display text-[34px] font-bold">
          {matches.length} suggested recipient{matches.length === 1 ? '' : 's'}
        </h1>
        <MatchList matches={matches} />
      </section>
    </main>
  );
}