'use client';

import { useId, useState } from 'react';
import type { RecipientListing } from '@/lib/listings';
import TierBadge from './TierBadge';
import { formatPickupDateTime } from '@/lib/format';
import { pickupSlots } from '@/lib/pickup-slots';

type AvailableCardProps = {
  listing: RecipientListing;
  onClaim?: (listing: RecipientListing, pickupTime: string) => void;
  pickupTimes?: string[];
  booking?: boolean;
  disabled?: boolean;
};

export default function AvailableCard({ listing, onClaim, pickupTimes, booking = false, disabled = false }: AvailableCardProps) {
  const slots = pickupTimes ?? (onClaim ? pickupSlots(listing.readyAt, listing.safeUntil) : []);
  const [pickupTime, setPickupTime] = useState('');
  const selectId = useId();

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-xl font-semibold">{listing.item}</h3>
          <p className="text-muted">
            {listing.donorName}{listing.distanceMiles !== null && ` · ${listing.distanceMiles} mi`}
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
            {listing.safeUntil ? formatPickupDateTime(listing.safeUntil) : 'Not provided'}
          </dd>
        </div>
      </dl>

      <p className="text-sm text-muted">{listing.tierReason}</p>

      {!onClaim ? (
        <p className="border-t border-line pt-4 text-sm text-muted">Pickup booking is not available yet.</p>
      ) : slots.length === 0 ? (
        <p className="border-t border-line pt-4 font-semibold text-warn-text">
          No pickup times match your organization’s windows and this listing’s availability in the next seven days.
        </p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (pickupTime && slots.includes(pickupTime) && !disabled) onClaim(listing, pickupTime);
          }}
          className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
        >
          <div className="flex w-full min-w-0 flex-col gap-1 sm:w-auto">
            <label htmlFor={selectId} className="text-sm font-bold">
              Pickup time
            </label>
            <select
              id={selectId}
              value={pickupTime}
              onChange={(event) => setPickupTime(event.target.value)}
              required
              disabled={disabled}
              className="min-h-11 w-full min-w-0 max-w-full rounded-lg border-[1.5px] border-field bg-surface px-3 text-base"
            >
              <option value="">Choose a time</option>
              {slots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatPickupDateTime(slot)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={disabled || !pickupTime || !slots.includes(pickupTime)}
            className="min-h-12 rounded-[10px] bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {booking ? 'Claiming…' : 'Claim'}<span className="sr-only"> {listing.item}</span>
          </button>
        </form>
      )}
    </article>
  );
}