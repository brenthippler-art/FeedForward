'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PostedListing } from '@/lib/donor-listings';
import type { MatchResult } from '@/lib/matches';
import { formatPickupDateTime } from '@/lib/format';
import TierBadge from './TierBadge';
import MatchList from './MatchList';

function Results({ listingId }: { listingId: number }) {
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/matches?listingId=${listingId}`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Suggested recipients could not be loaded.');
        if (!Array.isArray(data)) throw new Error('Unexpected matching response.');
        if (!controller.signal.aborted) setMatches(data);
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Suggested recipients could not be loaded.');
      }
    }
    void load();
    return () => controller.abort();
  }, [listingId, attempt]);
  if (error) return <div><p role="alert">{error}</p><button type="button" className="min-h-11 font-bold text-brand underline" onClick={() => { setError(''); setMatches(null); setAttempt((n) => n + 1); }}>Try again</button></div>;
  if (matches === null) return <p role="status">Loading suggested recipients…</p>;
  return <><h2 className="font-display text-2xl font-bold">{matches.length} suggested recipient{matches.length === 1 ? '' : 's'}</h2><MatchList matches={matches} /></>;
}

export default function SuggestedRecipients({ requestedListingId }: { requestedListingId?: string }) {
  const [listings, setListings] = useState<PostedListing[] | null>(null);
  const [selectedId, setSelectedId] = useState(requestedListingId ?? '');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/listings', { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error('Your posted food could not be loaded.');
        if (!controller.signal.aborted) setListings(data);
      } catch {
        if (!controller.signal.aborted) setError('Your posted food could not be loaded. Please try again.');
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);
  if (error) return <div><p role="alert">{error}</p><button type="button" className="min-h-11 font-bold text-brand underline" onClick={() => { setError(''); setAttempt((n) => n + 1); }}>Try again</button></div>;
  if (listings === null) return <p role="status">Loading your posted food…</p>;
  const available = listings.filter((listing) => listing.status === 'available' && listing.quantity > 0);
  const listing = available.find((item) => String(item.id) === selectedId) ?? (selectedId === '' ? available[0] : undefined);
  return <div className="flex flex-col gap-6">
    <Link href="/donor" className="font-semibold text-brand underline">Back to posted food</Link>
    {available.length === 0 ? <p>No available listings to match. Post food first, or check whether your food has already been reserved or expired.</p> : <>
      <label className="flex flex-col gap-2 font-bold">Your listing
        <select className="min-h-12 rounded-lg border border-field bg-surface px-3" value={listing?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)}>
          {!listing && <option value="">Select your listing</option>}
          {available.map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.item}</option>)}
        </select>
      </label>
      {!listing && <p role="alert">That listing is unavailable or does not belong to your organization. Select one of your available listings.</p>}
      {listing && <div className="flex flex-wrap items-start gap-6">
        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-2xl font-bold">{listing.item}</h2><TierBadge tier={listing.tier} />
          <p>{listing.quantity} {listing.unit} · {listing.estimatedLbs} lbs</p><p>{listing.condition}</p>
          <p>Pickup deadline: {listing.safeUntil ? formatPickupDateTime(listing.safeUntil) : 'Not set'}</p>
          <p className="text-sm text-muted">{listing.tierReason}</p>
        </aside>
        <section className="flex min-w-0 flex-[2_1_540px] flex-col gap-4"><Results key={listing.id} listingId={listing.id} /></section>
      </div>}
    </>}
  </div>;
}
