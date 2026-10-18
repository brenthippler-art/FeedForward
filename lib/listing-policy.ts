import type { FoodCategory } from '@/types';

export class ListingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ListingError';
  }
}

const CATEGORIES: FoodCategory[] = ['produce', 'dairy', 'meat', 'bakery', 'cooked', 'other'];

// Local override of DraftListing: tier/tierReason are never accepted from the
// client (always server-computed via lib/tiers.ts), and a few fields the shared
// type allows to be unknown at an earlier draft stage are required here, since
// the DB can't store them as unknown (see lib/create-listing.ts for why).
export type ListingDraftInput = {
  item: string;
  quantity: number;
  unit: string;
  estimatedLbs: number;
  condition: string;
  category: FoodCategory;
  containsMeat: boolean;
  hoursOut: number | null;
  safeUntil: string | null;
};

const MAX_LISTINGS_PER_REQUEST = 20;

function parseDraft(raw: unknown, index: number): ListingDraftInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ListingError(400, `Listing ${index}: must be an object.`);
  }
  const d = raw as Record<string, unknown>;

  if (typeof d.item !== 'string' || !d.item.trim() || d.item.length > 200) {
    throw new ListingError(400, `Listing ${index}: item must be a non-empty string up to 200 characters.`);
  }
  if (!Number.isInteger(d.quantity) || Number(d.quantity) <= 0) {
    throw new ListingError(400, `Listing ${index}: quantity must be a positive whole number.`);
  }
  if (typeof d.unit !== 'string' || !d.unit.trim() || d.unit.length > 50) {
    throw new ListingError(400, `Listing ${index}: unit must be a non-empty string up to 50 characters.`);
  }
  if (typeof d.estimatedLbs !== 'number' || !Number.isFinite(d.estimatedLbs) || d.estimatedLbs <= 0) {
    throw new ListingError(
      400,
      `Listing ${index}: estimatedLbs must be a positive number. A weight is required to record the ` +
        'listing even though the shared DraftListing type allows null for an earlier draft stage.',
    );
  }
  if (typeof d.category !== 'string' || !CATEGORIES.includes(d.category as FoodCategory)) {
    throw new ListingError(400, `Listing ${index}: category must be one of ${CATEGORIES.join(', ')}.`);
  }
  if (typeof d.containsMeat !== 'boolean') {
    throw new ListingError(400, `Listing ${index}: containsMeat must be a boolean.`);
  }

  let hoursOut: number | null = null;
  if (d.hoursOut !== undefined && d.hoursOut !== null) {
    if (typeof d.hoursOut !== 'number' || !Number.isFinite(d.hoursOut) || d.hoursOut < 0) {
      throw new ListingError(400, `Listing ${index}: hoursOut must be a non-negative number or null.`);
    }
    hoursOut = d.hoursOut;
  }
  if (d.category === 'cooked' && hoursOut === null) {
    throw new ListingError(
      400,
      `Listing ${index}: hoursOut is required for cooked food, to verify the USDA 2-hour safety window.`,
    );
  }

  const condition = typeof d.condition === 'string' && d.condition.trim() ? d.condition.trim().slice(0, 500) : 'unknown';

  let safeUntil: string | null = null;
  if (d.safeUntil !== undefined && d.safeUntil !== null) {
    if (typeof d.safeUntil !== 'string' || !Number.isFinite(Date.parse(d.safeUntil))) {
      throw new ListingError(400, `Listing ${index}: safeUntil must be a valid ISO timestamp or null.`);
    }
    safeUntil = new Date(d.safeUntil).toISOString();
  }

  return {
    item: d.item.trim(),
    quantity: Number(d.quantity),
    unit: d.unit.trim(),
    estimatedLbs: d.estimatedLbs,
    condition,
    category: d.category as FoodCategory,
    containsMeat: d.containsMeat,
    hoursOut,
    safeUntil,
  };
}

export function parseListingsInput(body: unknown, donorId: number): ListingDraftInput[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ListingError(400, 'Provide { donorId?, listings: [...] }.');
  }
  const data = body as Record<string, unknown>;
  if (data.donorId !== undefined && data.donorId !== donorId) {
    throw new ListingError(403, 'donorId must match the signed-in organization.');
  }
  if (!Array.isArray(data.listings) || data.listings.length === 0) {
    throw new ListingError(400, 'listings must be a non-empty array.');
  }
  if (data.listings.length > MAX_LISTINGS_PER_REQUEST) {
    throw new ListingError(400, `listings cannot exceed ${MAX_LISTINGS_PER_REQUEST} per request.`);
  }
  return data.listings.map((draft, index) => parseDraft(draft, index));
}
