import type { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { Tier } from '@/types';

export type RecipientReservation = {
  claimId: number;
  listing: {
    id: number;
    item: string;
    donorName: string;
    quantity: number;
    unit: string;
    estimatedLbs: number | null;
    tier: Tier;
  };
  pickupTime: string;
  status: 'claimed' | 'picked_up';
  actualLbs: number | null;
};

interface ReservationRow extends RowDataPacket {
  claim_id: number; item_id: number; item_name: string | null; donor_name: string;
  quantity: number; unit: string | null; estimated_lbs: string | number | null;
  tier: Tier; pickup_time: string; pickup_id: number | null; actual_lbs: string | number | null;
}

export async function getRecipientClaims(recipientId: number): Promise<RecipientReservation[]> {
  const [rows] = await pool.execute<ReservationRow[]>(`
    SELECT c.claim_id, i.item_id, i.item_name, o.org_name AS donor_name,
           COALESCE(p.quantity, i.quantity) AS quantity, i.unit, i.tier,
           COALESCE(p.quantity, i.quantity) * i.unit_weight AS estimated_lbs,
           DATE_FORMAT(c.pickup_time, '%Y-%m-%dT%H:%i:%s.000Z') AS pickup_time,
           p.pickup_id, p.actual_lbs
    FROM Claim c
    JOIN Item i ON i.item_id = c.item_id
    JOIN Organization o ON o.org_id = i.donor_id
    LEFT JOIN Pickup p ON p.claim_id = c.claim_id
    WHERE c.recipient_id = ?
    ORDER BY (p.pickup_id IS NOT NULL),
             CASE WHEN p.pickup_id IS NULL THEN c.pickup_time END ASC,
             p.date_picked_up DESC, c.claim_id DESC
    LIMIT 100
  `, [recipientId]);
  return rows.map((row) => ({
    claimId: row.claim_id,
    listing: {
      id: row.item_id,
      item: row.item_name?.trim() || `Listing #${row.item_id}`,
      donorName: row.donor_name,
      quantity: row.quantity,
      unit: row.unit || 'units',
      estimatedLbs: row.estimated_lbs === null ? null : Number(row.estimated_lbs),
      tier: row.tier,
    },
    pickupTime: row.pickup_time,
    status: row.pickup_id === null ? 'claimed' : 'picked_up',
    actualLbs: row.actual_lbs === null ? null : Number(row.actual_lbs),
  }));
}
