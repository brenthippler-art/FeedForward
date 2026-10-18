import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { Listing } from '@/types';
import { assignTier } from '@/lib/tiers';
import { ListingError, type ListingDraftInput } from '@/lib/listing-policy';

// USDA: never leave perishable food in the danger zone more than 2 hours.
// Mirrors the threshold in lib/tiers.ts.
const COOKED_SAFE_HOURS = 2;

function toMySQLDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export async function createListings(donorId: number, drafts: ListingDraftInput[]): Promise<Listing[]> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [donorRows] = await connection.execute<RowDataPacket[]>(
      'SELECT org_id FROM Donor WHERE org_id = ? FOR SHARE',
      [donorId],
    );
    if (!donorRows.length) throw new ListingError(403, 'Your organization is not registered as a donor.');

    const categoryNames = [...new Set(drafts.map((draft) => draft.category))];
    const [categoryRows] = await connection.query<RowDataPacket[]>(
      'SELECT category_id, category_name FROM Category WHERE category_name IN (?)',
      [categoryNames],
    );
    const categoryId: Record<string, number> = Object.fromEntries(
      categoryRows.map((row) => [row.category_name, row.category_id]),
    );
    for (const name of categoryNames) {
      if (!(name in categoryId)) throw new ListingError(503, `Category "${name}" is not configured.`);
    }

    const readyAt = new Date();
    const saved: Listing[] = [];

    for (const draft of drafts) {
      // Tier is always server-computed; a client-submitted tier is never trusted
      // (see lib/tiers.ts for the cited rules this enforces).
      const { tier, tierReason } = assignTier({
        category: draft.category,
        containsMeat: draft.containsMeat,
        hoursOut: draft.hoursOut,
        condition: draft.condition,
      });

      // Cooked food's deadline is derived from the cited USDA 2-hour rule.
      // Every other category has no sourced shelf-life threshold, so the donor
      // must supply safeUntil themselves for a tier-1 listing to be claimable
      // (lib/claim-policy.ts requires a non-null safe_until for tier 1).
      let safeUntil: string | null;
      if (draft.category === 'cooked' && draft.hoursOut !== null) {
        safeUntil = new Date(readyAt.getTime() + (COOKED_SAFE_HOURS - draft.hoursOut) * 3600 * 1000).toISOString();
      } else {
        safeUntil = draft.safeUntil;
      }
      if (tier === 1 && !safeUntil) {
        throw new ListingError(
          400,
          `"${draft.item}" needs a pickup deadline (safeUntil) before it can be listed for people.`,
        );
      }

      const unitWeight = (draft.estimatedLbs / draft.quantity).toFixed(2);
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO Item
           (donor_id, category_id, quantity, unit_weight, tier, item_name, unit,
            \`condition\`, contains_meat, hours_out, tier_reason, ready_at, safe_until)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          donorId,
          categoryId[draft.category],
          draft.quantity,
          unitWeight,
          tier,
          draft.item,
          draft.unit,
          draft.condition,
          draft.containsMeat ? 1 : 0,
          draft.hoursOut,
          tierReason,
          toMySQLDateTime(readyAt),
          safeUntil ? toMySQLDateTime(new Date(safeUntil)) : null,
        ],
      );

      saved.push({
        id: result.insertId,
        donorId,
        item: draft.item,
        quantity: draft.quantity,
        unit: draft.unit,
        estimatedLbs: draft.estimatedLbs,
        condition: draft.condition,
        category: draft.category,
        containsMeat: draft.containsMeat,
        hoursOut: draft.hoursOut,
        tier,
        tierReason,
        safeUntil,
        status: 'available',
      });
    }

    await connection.commit();
    return saved;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}
