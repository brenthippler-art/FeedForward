import type { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { AvailableListing } from '@/types';

// The schema has no coordinates, so distance is unknown rather than fabricated.
export type RecipientListing = Omit<AvailableListing, 'distanceMiles' | 'category' | 'containsMeat'> & {
  distanceMiles: number | null;
  category: string;
  containsMeat: boolean | null;
};

export interface ListingRow extends RowDataPacket {
  item_id: number;
  donor_id: number;
  donor_name: string;
  category_name: string;
  quantity: number;
  total_weight: string | number;
  tier: 1 | 2 | 3;
  item_name: string;
  unit: string;
  condition: string | null;
  contains_meat: number | null;
  hours_out: string | number | null;
  tier_reason: string | null;
  ready_at: string;
  safe_until: string | null;
}

export function mapListing(row: ListingRow): RecipientListing {
  return {
    id: row.item_id,
    donorId: row.donor_id,
    donorName: row.donor_name,
    item: row.item_name,
    category: row.category_name,
    quantity: row.quantity,
    unit: row.unit,
    estimatedLbs: Number(row.total_weight),
    condition: row.condition?.trim() || 'unknown',
    containsMeat: row.contains_meat === null ? null : Boolean(row.contains_meat),
    hoursOut: row.hours_out === null ? null : Number(row.hours_out),
    tier: row.tier,
    tierReason: row.tier_reason || '',
    readyAt: row.ready_at,
    safeUntil: row.safe_until,
    status: 'available',
    distanceMiles: null,
  };
}

export async function getRecipientListings(recipientId: number, tier?: number) {
  // DATETIME availability values must be stored as UTC.
  // Claims currently reserve an entire item; partial reservations need a separate contract.
  const [rows] = await pool.execute<ListingRow[]>(`
    SELECT i.item_id, i.donor_id, o.org_name AS donor_name, c.category_name,
           i.quantity, i.total_weight, i.tier, i.item_name, i.unit,
           i.\`condition\`, i.contains_meat, i.hours_out, i.tier_reason,
           DATE_FORMAT(i.ready_at, '%Y-%m-%dT%H:%i:%s.000Z') AS ready_at,
           DATE_FORMAT(i.safe_until, '%Y-%m-%dT%H:%i:%s.000Z') AS safe_until
    FROM Item i
    JOIN Donor d ON d.org_id = i.donor_id
    JOIN Organization o ON o.org_id = d.org_id
    JOIN Category c ON c.category_id = i.category_id
    WHERE i.quantity > 0
      AND i.tier IN (1, 2, 3)
      AND i.item_name IS NOT NULL AND TRIM(i.item_name) <> ''
      AND i.unit IS NOT NULL AND TRIM(i.unit) <> ''
      AND i.ready_at IS NOT NULL
      AND (i.safe_until IS NULL OR (i.safe_until > UTC_TIMESTAMP() AND i.safe_until > i.ready_at))
      AND EXISTS (
        SELECT 1 FROM AcceptedTier a JOIN Recipient r ON r.org_id = a.recipient_id
        WHERE a.recipient_id = ? AND a.tier = i.tier
      )
      AND NOT EXISTS (
        SELECT 1 FROM RefusedCategory f
        WHERE f.recipient_id = ? AND f.category_id = i.category_id
      )
      AND NOT EXISTS (SELECT 1 FROM Claim cl WHERE cl.item_id = i.item_id)
      ${tier === undefined ? '' : 'AND i.tier = ?'}
    ORDER BY i.tier, i.safe_until IS NULL, i.safe_until, i.item_id
    LIMIT 100
  `, tier === undefined ? [recipientId, recipientId] : [recipientId, recipientId, tier]);
  return rows.map(mapListing);
}
