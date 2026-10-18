import type { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import { getRecipientListings, type RecipientListing } from '@/lib/listings';
import { bookablePickupSlots } from '@/lib/pickup-slots';
import type { PickupWindow } from '@/lib/claim-policy';

export type BookableListing = RecipientListing & { pickupSlots: string[] };

export async function getBookableListings(recipientId: number, tier?: number): Promise<BookableListing[]> {
  const [listings, [windows], [clock]] = await Promise.all([
    getRecipientListings(recipientId, tier),
    pool.execute<(PickupWindow & RowDataPacket)[]>(
      'SELECT day_of_week, pickup_start, pickup_end FROM AcceptanceRule WHERE recipient_id = ?', [recipientId],
    ),
    pool.query<RowDataPacket[]>("SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s.000Z') AS now"),
  ]);
  const now = Date.parse(clock[0].now);
  return listings.map((listing) => ({
    ...listing,
    pickupSlots: bookablePickupSlots(listing.readyAt, listing.safeUntil, listing.tier, windows, now),
  }));
}
