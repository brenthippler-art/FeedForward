import type { RowDataPacket } from 'mysql2';
import { pool } from '@/lib/db';
import type { OrgType, RecipientMatch } from '@/types';
import { haversineMiles, zipCoordinates } from '@/lib/zip-coordinates';

// The schema has no geocoding, so distance is unknown rather than fabricated
// when either org's zip isn't in our lookup table.
export type MatchResult = Omit<RecipientMatch, 'distanceMiles'> & { distanceMiles: number | null };

export class MatchError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'MatchError';
  }
}

interface ItemRow extends RowDataPacket {
  item_id: number;
  donor_id: number;
  category_id: number;
  tier: number;
}

interface RecipientRow extends RowDataPacket {
  org_id: number;
  org_name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  type: OrgType;
}

interface RuleRow extends RowDataPacket {
  recipient_id: number;
  day_of_week: string;
  pickup_start: string;
  pickup_end: string;
}

const MAX_MATCHES = 3;

export async function getListingMatches(listingId: number, donorOrgId: number): Promise<MatchResult[]> {
  const [items] = await pool.execute<ItemRow[]>(
    `SELECT item_id, donor_id, category_id, tier FROM Item
     WHERE item_id = ? AND quantity > 0
       AND (safe_until IS NULL OR safe_until > UTC_TIMESTAMP())
       AND NOT EXISTS (SELECT 1 FROM Claim WHERE Claim.item_id = Item.item_id)`,
    [listingId],
  );
  const item = items[0];
  if (!item) throw new MatchError(404, 'Listing not found.');
  if (item.donor_id !== donorOrgId) throw new MatchError(403, 'This listing belongs to a different donor.');

  const [recipients] = await pool.execute<RecipientRow[]>(
    `
    SELECT r.org_id, o.org_name, o.street_address, o.city, o.state, o.zip_code,
           o.contact_name, o.contact_email, o.contact_phone, r.type
    FROM Recipient r
    JOIN Organization o ON o.org_id = r.org_id
    JOIN AcceptedTier at ON at.recipient_id = r.org_id AND at.tier = ?
    WHERE NOT EXISTS (
      SELECT 1 FROM RefusedCategory rc WHERE rc.recipient_id = r.org_id AND rc.category_id = ?
    )
    AND EXISTS (
      SELECT 1 FROM AcceptanceRule ar WHERE ar.recipient_id = r.org_id
    )
    ORDER BY r.org_id
    `,
    [item.tier, item.category_id],
  );
  if (recipients.length === 0) return [];

  const [donorRows] = await pool.execute<RowDataPacket[]>(
    'SELECT zip_code FROM Organization WHERE org_id = ?',
    [item.donor_id],
  );
  const donorZip: string | undefined = donorRows[0]?.zip_code;

  const recipientIds = recipients.map((r) => r.org_id);
  const [rules] = await pool.query<RuleRow[]>(
    `SELECT recipient_id, day_of_week, pickup_start, pickup_end FROM AcceptanceRule WHERE recipient_id IN (?)`,
    [recipientIds],
  );
  const rulesByRecipient = new Map<number, RuleRow[]>();
  for (const rule of rules) {
    const list = rulesByRecipient.get(rule.recipient_id) ?? [];
    list.push(rule);
    rulesByRecipient.set(rule.recipient_id, list);
  }

  const withDistance = recipients.map((recipient) => ({
    recipient,
    distanceMiles: donorZip ? haversineMiles(donorZip, recipient.zip_code) : null,
  }));

  withDistance.sort((a, b) => {
    if (a.distanceMiles === null && b.distanceMiles === null) return a.recipient.org_id - b.recipient.org_id;
    if (a.distanceMiles === null) return 1;
    if (b.distanceMiles === null) return -1;
    return a.distanceMiles - b.distanceMiles || a.recipient.org_id - b.recipient.org_id;
  });

  return withDistance.slice(0, MAX_MATCHES).map(({ recipient, distanceMiles }) => {
    const coords = zipCoordinates(recipient.zip_code);
    const reasons = [`Accepts tier ${item.tier} items`];
    if (distanceMiles !== null) reasons.push(`${distanceMiles.toFixed(1)} mi away`);
    for (const rule of rulesByRecipient.get(recipient.org_id) ?? []) {
      reasons.push(`Pickup window: ${rule.day_of_week} ${rule.pickup_start}–${rule.pickup_end} CT`);
    }

    return {
      recipient: {
        id: recipient.org_id,
        name: recipient.org_name,
        type: recipient.type,
        address: `${recipient.street_address}, ${recipient.city}, ${recipient.state} ${recipient.zip_code}`,
        lat: coords?.lat ?? 0,
        lng: coords?.lng ?? 0,
        verified: true,
        contactName: recipient.contact_name,
        phone: recipient.contact_phone,
        email: recipient.contact_email,
      },
      distanceMiles,
      reasons,
    };
  });
}
