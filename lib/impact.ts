import type { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { Impact, RecentPickup, Tier } from '@/types';

interface TotalsRow extends RowDataPacket {
  total_lbs: string | number;
  pickups: number;
  tier1: string | number;
  tier2: string | number;
  tier3: string | number;
}

interface RecentRow extends RowDataPacket {
  pickup_id: number;
  date: string;
  item: string;
  donor_name: string;
  recipient_name: string;
  tier: Tier;
  lbs: string | number;
}

const RECENT_LIMIT = 5;

// lbs is COALESCE(actual_lbs, pickup quantity * unit weight): prefer the measured weight at
// pickup, fall back to the item's estimate when actual_lbs wasn't recorded.
const LBS_EXPR = 'COALESCE(p.actual_lbs, p.quantity * i.unit_weight)';

export async function getImpact(orgId?: number): Promise<Impact> {
  // The API chooses the scope from the session. An explicit recipient scope
  // never falls back to platform totals, even if the recipient was removed.
  const recipientId = orgId;

  const scopeClause = recipientId !== undefined ? 'WHERE c.recipient_id = ?' : '';
  const scopeParams = recipientId !== undefined ? [recipientId] : [];

  const [totalsRows] = await pool.execute<TotalsRow[]>(
    `
    SELECT
      COALESCE(SUM(${LBS_EXPR}), 0) AS total_lbs,
      COUNT(*) AS pickups,
      COALESCE(SUM(CASE WHEN i.tier = 1 THEN ${LBS_EXPR} ELSE 0 END), 0) AS tier1,
      COALESCE(SUM(CASE WHEN i.tier = 2 THEN ${LBS_EXPR} ELSE 0 END), 0) AS tier2,
      COALESCE(SUM(CASE WHEN i.tier = 3 THEN ${LBS_EXPR} ELSE 0 END), 0) AS tier3
    FROM Pickup p
    JOIN Claim c ON c.claim_id = p.claim_id
    JOIN Item i ON i.item_id = c.item_id
    ${scopeClause}
    `,
    scopeParams,
  );
  const totals = totalsRows[0];

  const [recentRows] = await pool.execute<RecentRow[]>(
    `
    SELECT p.pickup_id, DATE_FORMAT(p.date_picked_up, '%Y-%m-%d') AS date,
           i.item_name AS item, donor.org_name AS donor_name, recip.org_name AS recipient_name,
           i.tier AS tier, ${LBS_EXPR} AS lbs
    FROM Pickup p
    JOIN Claim c ON c.claim_id = p.claim_id
    JOIN Item i ON i.item_id = c.item_id
    JOIN Organization donor ON donor.org_id = i.donor_id
    JOIN Organization recip ON recip.org_id = c.recipient_id
    ${scopeClause}
    ORDER BY p.date_picked_up DESC, p.pickup_id DESC
    LIMIT ${RECENT_LIMIT}
    `,
    scopeParams,
  );

  const recent: RecentPickup[] = recentRows.map((row) => ({
    pickupId: row.pickup_id,
    date: row.date,
    item: row.item,
    donorName: row.donor_name,
    recipientName: row.recipient_name,
    tier: row.tier,
    lbs: Number(row.lbs),
  }));

  return {
    totalLbs: Number(totals.total_lbs),
    lbsByTier: { 1: Number(totals.tier1), 2: Number(totals.tier2), 3: Number(totals.tier3) },
    meals: 0, // no sourced lbs-per-meal conversion figure yet
    pickups: Number(totals.pickups),
    recent,
  };
}
