import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { Claim } from '@/types';
import { ClaimError, fitsPickupWindow, validateAvailability, type ClaimInput, type PickupWindow } from '@/lib/claim-policy';

interface ClaimItem extends RowDataPacket {
  item_id: number; category_id: number; quantity: number; tier: number;
  item_name: string | null; unit: string | null;
  ready_at: string | null; safe_until: string | null;
}

export async function createClaim(recipientId: number, input: ClaimInput): Promise<Claim> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Serialize all booking attempts for this listing before checking its claim.
    const [items] = await connection.execute<ClaimItem[]>(`
      SELECT item_id, category_id, quantity, tier, item_name, unit,
        DATE_FORMAT(ready_at, '%Y-%m-%dT%H:%i:%s.000Z') AS ready_at,
        DATE_FORMAT(safe_until, '%Y-%m-%dT%H:%i:%s.000Z') AS safe_until
      FROM Item WHERE item_id = ? FOR UPDATE
    `, [input.listingId]);
    const item = items[0];
    if (!item) throw new ClaimError(404, 'Listing not found.');

    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT claim_id FROM Claim WHERE item_id = ? FOR UPDATE', [input.listingId],
    );
    if (existing.length) throw new ClaimError(409, 'This listing has already been claimed. Refresh available food.');

    const [recipients] = await connection.execute<RowDataPacket[]>(
      'SELECT org_id FROM Recipient WHERE org_id = ? FOR SHARE', [recipientId],
    );
    if (!recipients.length) throw new ClaimError(403, 'Your organization is not registered as a recipient.');
    const [tiers] = await connection.execute<RowDataPacket[]>(
      'SELECT tier FROM AcceptedTier WHERE recipient_id = ? AND tier = ? FOR SHARE', [recipientId, item.tier],
    );
    if (!tiers.length) throw new ClaimError(403, 'Your organization does not accept this listing tier.');
    const [refused] = await connection.execute<RowDataPacket[]>(
      'SELECT category_id FROM RefusedCategory WHERE recipient_id = ? AND category_id = ? FOR SHARE', [recipientId, item.category_id],
    );
    if (refused.length) throw new ClaimError(403, 'Your organization refuses this food category.');
    const [windows] = await connection.execute<(PickupWindow & RowDataPacket)[]>(
      'SELECT day_of_week, pickup_start, pickup_end FROM AcceptanceRule WHERE recipient_id = ? FOR SHARE', [recipientId],
    );
    if (!fitsPickupWindow(input.pickupTime, windows)) {
      throw new ClaimError(400, 'Choose a time within your organization’s pickup windows (Central time).');
    }
    // Read the database clock after lock waits, so a time that passed while
    // another transaction held a lock cannot be booked.
    const [clock] = await connection.query<RowDataPacket[]>(
      "SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s.000Z') AS now",
    );
    validateAvailability({ ...item, now: clock[0].now }, input.pickupTime);
    const sqlTime = input.pickupTime.slice(0, 19).replace('T', ' ');
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO Claim (item_id, recipient_id, claim_time, pickup_time) VALUES (?, ?, UTC_TIMESTAMP(), ?)',
      [input.listingId, recipientId, sqlTime],
    );
    await connection.commit();
    // Reserving does not decrement stock; the pickup trigger owns that change.
    return { id: result.insertId, listingId: input.listingId, recipientId, pickupTime: input.pickupTime };
  } catch (error) {
    await connection.rollback().catch(() => {});
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new ClaimError(409, 'This listing has already been claimed. Refresh available food.');
    }
    throw error;
  } finally {
    connection.release();
  }
}
