import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '@/lib/db';
import type { ListingStatus } from '@/types';
import { ListingError, parseListingRequest, type ListingInput } from '@/lib/listing-input';

export type DonorListing = ListingInput & {
  id: number; donorId: number; estimatedLbs: number; tierReason: string; status: ListingStatus;
};
interface DonorRow extends RowDataPacket {
  item_id: number; donor_id: number; category_name: ListingInput['category']; quantity: number;
  unit_weight: string | number; total_weight: string | number; tier: ListingInput['tier'];
  item_name: string | null; unit: string | null; condition: string | null; contains_meat: number | null;
  hours_out: string | number | null; tier_reason: string | null; ready_at: string | null; safe_until: string | null;
  status: ListingStatus;
}
// Older seeded rows can have missing details; don't invent availability for them.
export type PostedListing = Omit<DonorListing, 'readyAt' | 'containsMeat'> & { readyAt: string | null; containsMeat: boolean | null };

async function readDonorListings(database: Pool | PoolConnection, donorId: number, tier?: number, ids?: number[]): Promise<PostedListing[]> {
  const params: number[] = [donorId];
  if (tier !== undefined) params.push(tier);
  if (ids) params.push(...ids);
  const [rows] = await database.execute<DonorRow[]>(`
    SELECT i.item_id, i.donor_id, i.quantity, i.unit_weight, i.total_weight,
      i.tier, i.item_name, i.unit, i.\`condition\`, i.contains_meat,
      i.hours_out, i.tier_reason, c.category_name,
      DATE_FORMAT(i.ready_at, '%Y-%m-%dT%H:%i:%s.000Z') AS ready_at,
      DATE_FORMAT(i.safe_until, '%Y-%m-%dT%H:%i:%s.000Z') AS safe_until,
      CASE WHEN p.pickup_id IS NOT NULL THEN 'picked_up'
           WHEN cl.claim_id IS NOT NULL THEN 'claimed' ELSE 'available' END AS status
    FROM Item i JOIN Category c ON c.category_id = i.category_id
    LEFT JOIN Claim cl ON cl.item_id = i.item_id
    LEFT JOIN Pickup p ON p.claim_id = cl.claim_id
    WHERE i.donor_id = ? ${tier === undefined ? '' : 'AND i.tier = ?'}
      ${ids ? `AND i.item_id IN (${ids.map(() => '?').join(',')})` : ''}
    ORDER BY i.item_id DESC LIMIT 100
  `, params);
  return rows.map((row) => ({
    id: row.item_id, donorId: row.donor_id, item: row.item_name || `Listing #${row.item_id}`,
    category: row.category_name, quantity: row.quantity, unit: row.unit || 'units',
    unitWeight: Number(row.unit_weight), estimatedLbs: Number(row.total_weight),
    tier: row.tier, condition: row.condition || 'unknown',
    containsMeat: row.contains_meat === null ? null : Boolean(row.contains_meat),
    hoursOut: row.hours_out === null ? null : Number(row.hours_out),
    tierReason: row.tier_reason || '', readyAt: row.ready_at, safeUntil: row.safe_until, status: row.status,
  }));
}

export async function getDonorListings(donorId: number, tier?: number) {
  return readDonorListings(pool, donorId, tier);
}

export async function createListings(donorId: number, inputs: ListingInput[]) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [donors] = await connection.execute<RowDataPacket[]>('SELECT org_id FROM Donor WHERE org_id = ? FOR SHARE', [donorId]);
    if (!donors.length) throw new ListingError(403, 'Your organization is not registered as a donor.');
    const [clock] = await connection.query<RowDataPacket[]>("SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s.000Z') AS now");
    const listings = parseListingRequest({ confirmed: true, listings: inputs }, donorId, Date.parse(clock[0].now));
    const names = [...new Set(listings.map((listing) => listing.category))];
    const [categories] = await connection.execute<RowDataPacket[]>(
      `SELECT category_id, category_name FROM Category WHERE category_name IN (${names.map(() => '?').join(',')}) FOR SHARE`, names,
    );
    const categoryIds = new Map(categories.map((row) => [row.category_name, row.category_id]));
    for (const name of names) if (!categoryIds.has(name)) throw new ListingError(400, `The ${name} category is not configured. Ask your team to seed it before posting.`);
    const ids: number[] = [];
    for (const listing of listings) {
      const reason = `Donor confirmed tier ${listing.tier}.`;
      const [result] = await connection.execute<ResultSetHeader>(`
        INSERT INTO Item (donor_id, category_id, quantity, unit_weight, tier, item_name,
          unit, \`condition\`, contains_meat, hours_out, tier_reason, ready_at, safe_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [donorId, categoryIds.get(listing.category), listing.quantity, listing.unitWeight.toFixed(2),
        listing.tier, listing.item, listing.unit, listing.condition, listing.containsMeat ? 1 : 0,
        listing.hoursOut === null ? null : listing.hoursOut.toFixed(2), reason,
        listing.readyAt.slice(0, 19).replace('T', ' '), listing.safeUntil?.slice(0, 19).replace('T', ' ') ?? null]);
      ids.push(result.insertId);
    }
    const saved = await readDonorListings(connection, donorId, undefined, ids);
    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
