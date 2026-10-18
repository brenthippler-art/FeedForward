import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { Pickup } from '@/types';
import { fitsPickupWindow, type PickupWindow } from '@/lib/claim-policy';
import { PickupError, validatePickupTime, type PickupInput } from '@/lib/pickup-policy';

interface ClaimRow extends RowDataPacket {
  item_id: number; recipient_id: number; pickup_time: string;
}
interface ItemRow extends RowDataPacket {
  quantity: number; category_id: number; tier: number; ready_at: string | null; safe_until: string | null;
}

export async function completePickup(recipientId: number, input: PickupInput): Promise<Pickup> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Discover the item without locking Claim first: booking locks Item then Claim.
    const [references] = await connection.execute<ClaimRow[]>(
      'SELECT item_id, recipient_id FROM Claim WHERE claim_id = ?', [input.claimId],
    );
    if (!references[0]) throw new PickupError(404, 'Reservation not found.');
    if (references[0].recipient_id !== recipientId) throw new PickupError(403, 'This reservation belongs to another recipient.');
    const [items] = await connection.execute<ItemRow[]>(`
      SELECT quantity, category_id, tier,
        DATE_FORMAT(ready_at, '%Y-%m-%dT%H:%i:%s.000Z') AS ready_at,
        DATE_FORMAT(safe_until, '%Y-%m-%dT%H:%i:%s.000Z') AS safe_until
      FROM Item WHERE item_id = ? FOR UPDATE
    `, [references[0].item_id]);
    const [claims] = await connection.execute<ClaimRow[]>(`
      SELECT item_id, recipient_id, DATE_FORMAT(pickup_time, '%Y-%m-%dT%H:%i:%s.000Z') AS pickup_time
      FROM Claim WHERE claim_id = ? FOR UPDATE
    `, [input.claimId]);
    const claim = claims[0];
    if (!claim) throw new PickupError(404, 'Reservation not found.');
    if (claim.recipient_id !== recipientId) throw new PickupError(403, 'This reservation belongs to another recipient.');
    if (claim.item_id !== references[0].item_id) throw new PickupError(409, 'The reservation changed. Refresh your pickups.');
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT pickup_id FROM Pickup WHERE claim_id = ? FOR UPDATE', [input.claimId],
    );
    if (existing.length) throw new PickupError(409, 'This reservation has already been picked up.');
    const item = items[0];
    if (!item || !Number.isInteger(item.quantity) || item.quantity <= 0 || ![1, 2, 3].includes(item.tier)) {
      throw new PickupError(409, 'This listing no longer has available stock.');
    }
    const [tiers] = await connection.execute<RowDataPacket[]>(`
      SELECT a.tier FROM AcceptedTier a JOIN Recipient r ON r.org_id = a.recipient_id
      WHERE a.recipient_id = ? AND a.tier = ? FOR SHARE
    `, [recipientId, item.tier]);
    const [refused] = await connection.execute<RowDataPacket[]>(
      'SELECT category_id FROM RefusedCategory WHERE recipient_id = ? AND category_id = ? FOR SHARE', [recipientId, item.category_id],
    );
    if (!tiers.length || refused.length) throw new PickupError(403, 'Your organization no longer accepts this food.');
    const [windows] = await connection.execute<(PickupWindow & RowDataPacket)[]>(
      'SELECT day_of_week, pickup_start, pickup_end FROM AcceptanceRule WHERE recipient_id = ? FOR SHARE', [recipientId],
    );
    // Read the clock after lock waits, so expiry is evaluated at completion.
    const [clock] = await connection.query<RowDataPacket[]>(
      "SELECT DATE_FORMAT(UTC_TIMESTAMP(), '%Y-%m-%dT%H:%i:%s.000Z') AS now",
    );
    const now = String(clock[0].now);
    validatePickupTime(item, claim.pickup_time, now);
    if (!fitsPickupWindow(now, windows)) throw new PickupError(409, 'Confirm pickup within your organization’s pickup windows (Central time).');
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO Pickup (claim_id, quantity, actual_lbs, date_picked_up)
      VALUES (?, ?, ?, ?)
    `, [input.claimId, item.quantity, input.actualLbs.toFixed(3), now.slice(0, 19).replace('T', ' ')]);
    // The existing stock trigger is the only inventory decrement. Never UPDATE Item here.
    await connection.commit();
    return { id: result.insertId, claimId: input.claimId, actualLbs: input.actualLbs, pickedUpAt: now };
  } catch (error) {
    await connection.rollback().catch(() => {});
    const code = (error as { code?: string }).code;
    if (code === 'ER_DUP_ENTRY') throw new PickupError(409, 'This reservation has already been picked up.');
    if (code === 'ER_SIGNAL_EXCEPTION') throw new PickupError(409, 'Pickup could not be completed because the reservation or stock changed. Refresh your pickups.');
    throw error;
  } finally {
    connection.release();
  }
}
