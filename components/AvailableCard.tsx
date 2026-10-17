'use client';

import { useId, useState } from 'react';
import type { AvailableListing } from '@/types';
import TierBadge from './TierBadge';
import { formatTime } from '@/lib/format';
import { pickupSlots } from '@/lib/pickup-slots';

type AvailableCardProps = {
  listing: AvailableListing;
  onClaim: (listing: AvailableListing, pickupTime: string) => void;
};

export default function AvailableCard({ listing, onClaim }: AvailableCardProps) {
  const slots = pickupSlots(listing.readyAt, listing.safeUntil);
  const [pickupTime, setPickupTime] = useState('');
  const selectId = useId();

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-xl font-semibold">{listing.item}</h3>
          <p className="text-muted">
            {listing.donorName} · {listing.distanceMiles} mi
          </p>
        </div>
        <TierBadge tier={listing.tier} />
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Quantity</dt>
          <dd className="font-semibold">
            {listing.quantity} {listing.unit}
            {listing.unit !== 'lbs' && listing.estimatedLbs !== null && ` · ~${listing.estimatedLbs} lbs`}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Condition</dt>
          <dd className="font-semibold">{listing.condition}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Safe until</dt>
          <dd className="font-semibold">
            {listing.safeUntil ? formatTime(listing.safeUntil) : 'No time limit'}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-muted">{listing.tierReason}</p>

      {slots.length === 0 ? (
        <p className="border-t border-line pt-4 font-semibold text-warn-text">
          The safe pickup window has passed.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pickupTime) onClaim(listing, pickupTime);
          }}
          className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={selectId} className="text-sm font-bold">
              Pickup time
            </label>
            <select
              id={selectId}
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
              required
              className="min-h-11 rounded-lg border-[1.5px] border-field bg-surface px-3"
            >
              <option value="">Choose a time</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatTime(slot)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!pickupTime}
            className="min-h-12 rounded-[10px] bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Claim<span className="sr-only"> {listing.item}</span>
          </button>
        </form>
      )}
    </article>
  );
}