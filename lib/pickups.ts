import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { Pickup } from '@/types';
import { PickupError, type PickupInput } from '@/lib/pickup-policy';

interface ClaimRow extends RowDataPacket {
  claim_id: number;
  item_id: number;
  recipient_id: number;
}

export async function createPickup(recipientId: number, input: PickupInput): Promise<Pickup> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [claims] = await connection.execute<ClaimRow[]>(
      'SELECT claim_id, item_id, recipient_id FROM Claim WHERE claim_id = ? FOR UPDATE',
      [input.claimId],
    );
    const claim = claims[0];
    if (!claim) throw new PickupError(404, 'Claim not found.');
    if (claim.recipient_id !== recipientId) throw new PickupError(403, 'This claim belongs to a different recipient.');

    // Pre-check so a repeat completion gets a clear message rather than the raw
    // uq_pickup_claim constraint error; FOR UPDATE still serializes concurrent attempts.
    const [existingPickups] = await connection.execute<RowDataPacket[]>(
      'SELECT pickup_id FROM Pickup WHERE claim_id = ? FOR UPDATE', [input.claimId],
    );
    if (existingPickups.length) throw new PickupError(409, 'This claim has already been picked up.');

    // quantity is not caller-supplied: the before_pickup_whole_listing trigger requires
    // it to equal the item's current remaining stock exactly, so we read that under lock.
    const [items] = await connection.execute<RowDataPacket[]>(
      'SELECT quantity FROM Item WHERE item_id = ? FOR UPDATE', [claim.item_id],
    );
    const item = items[0];
    if (!item || item.quantity <= 0) throw new PickupError(409, 'This listing has no remaining quantity to pick up.');

    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO Pickup (claim_id, quantity, actual_lbs) VALUES (?, ?, ?)',
      [input.claimId, item.quantity, input.actualLbs],
    );
    const [pickedRows] = await connection.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(date_picked_up, '%Y-%m-%dT%H:%i:%s.000Z') AS picked_up_at
       FROM Pickup WHERE pickup_id = ?`,
      [result.insertId],
    );

    await connection.commit();
    return {
      id: result.insertId,
      claimId: input.claimId,
      actualLbs: input.actualLbs,
      pickedUpAt: pickedRows[0].picked_up_at,
    };
  } catch (error) {
    await connection.rollback().catch(() => {});
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new PickupError(409, 'This claim has already been picked up.');
    }
    throw error;
  } finally {
    connection.release();
  }
}
