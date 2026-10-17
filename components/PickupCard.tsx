'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { RecipientPickup } from '@/types';
import TierBadge from './TierBadge';
import { formatTime } from '@/lib/format';

type PickupCardProps = {
  pickup: RecipientPickup;
  onPickedUp: (claimId: number, actualLbs: number) => void;
};

export default function PickupCard({ pickup, onPickedUp }: PickupCardProps) {
  const { listing } = pickup;
  const [logging, setLogging] = useState(false);
  const [lbs, setLbs] = useState(listing.estimatedLbs?.toString() ?? '');
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const weight = Number(lbs);
  const valid = lbs !== '' && weight > 0;

  useEffect(() => {
    if (logging) inputRef.current?.focus();
  }, [logging]);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-lg font-semibold">{listing.item}</h3>
          <p className="text-muted">
            {listing.donorName} · {formatTime(pickup.pickupTime)}
          </p>
        </div>
        <TierBadge tier={listing.tier} />
      </div>

      {pickup.status === 'picked_up' ? (
        <p className="font-semibold text-brand-dark">✓ Picked up · {pickup.actualLbs} lbs</p>
      ) : logging ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onPickedUp(pickup.claimId, weight);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-sm font-bold">
              Actual weight (lbs)
            </label>
            <input
              ref={inputRef}
              id={inputId}
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={lbs}
              onChange={(event) => setLbs(event.target.value)}
              required
              className="min-h-11 w-32 rounded-lg border-[1.5px] border-field bg-surface px-3"
            />
          </div>
          <button
            type="submit"
            disabled={!valid}
            className="min-h-12 rounded-[10px] bg-brand px-5 font-bold text-white hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm pickup
          </button>
          <button
            type="button"
            onClick={() => setLogging(false)}
            className="min-h-11 px-3 font-semibold text-brand underline"
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setLogging(true)}
          className="min-h-12 self-start rounded-[10px] border-[1.5px] border-brand bg-surface px-5 font-bold text-brand"
        >
          Mark picked up<span className="sr-only"> {listing.item}</span>
        </button>
      )}
    </article>
  );
}