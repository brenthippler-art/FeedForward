'use client';

import { useState } from 'react';
import type { AvailableListing, RecipientPickup } from '@/types';
import AvailableCard from './AvailableCard';
import PickupCard from './PickupCard';
import { formatTime } from '@/lib/format';

type RecipientBoardProps = {
  listings: AvailableListing[];
};

export default function RecipientBoard({ listings }: RecipientBoardProps) {
  const [available, setAvailable] = useState(listings);
  const [pickups, setPickups] = useState<RecipientPickup[]>([]);
  const [message, setMessage] = useState('');

  function handleClaim(listing: AvailableListing, pickupTime: string) {
    // TODO: POST /api/claims { listingId, recipientId, pickupTime } and use the returned claim id
    setAvailable((current) => current.filter((item) => item.id !== listing.id));
    setPickups((current) => [
      ...current,
      { claimId: listing.id, listing, pickupTime, status: 'claimed', actualLbs: null },
    ]);
    setMessage(
      `Claimed ${listing.item}. Pick up at ${formatTime(pickupTime)} from ${listing.donorName}.`,
    );
  }

  function handlePickedUp(claimId: number, actualLbs: number) {
    // TODO: POST /api/pickups { claimId, actualLbs }
    setPickups((current) =>
      current.map((pickup) =>
        pickup.claimId === claimId ? { ...pickup, status: 'picked_up', actualLbs } : pickup,
      ),
    );
    setMessage(`Logged ${actualLbs} lbs. Thank you for picking it up!`);
  }

  return (
    <>
      <div role="status" aria-live="polite">
        {message && (
          <p className="rounded-xl border border-brand bg-verified-tint px-4 py-3 font-semibold text-brand-dark">
            {message}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="available-h" className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <h2 id="available-h" className="font-display text-2xl font-semibold">
            Ready for pickup <span className="text-muted">({available.length})</span>
          </h2>
          {available.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-6 text-muted">
              Nothing new right now. When a donor posts food that your rules accept, it shows up here.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {available.map((listing) => (
                <li key={listing.id}>
                  <AvailableCard listing={listing} onClaim={handleClaim} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="pickups-h" className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
          <h2 id="pickups-h" className="font-display text-2xl font-semibold">
            Your pickups
          </h2>
          {pickups.length === 0 ? (
            <p className="rounded-2xl border border-line bg-surface p-6 text-muted">
              Food you claim shows up here so you can log its weight at pickup.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {pickups.map((pickup) => (
                <li key={pickup.claimId}>
                  <PickupCard pickup={pickup} onPickedUp={handlePickedUp} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-sm text-muted">Sample listings for the demo.</p>
    </>
  );
}