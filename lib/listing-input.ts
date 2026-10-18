import type { DraftListing, FoodCategory } from '@/types';

export const FOOD_CATEGORIES: FoodCategory[] = ['produce', 'dairy', 'meat', 'bakery', 'cooked', 'other'];
export type ListingInput = Omit<DraftListing, 'estimatedLbs' | 'tierReason'> & {
  unitWeight: number;
  readyAt: string;
  safeUntil: string | null;
};
export class ListingError extends Error {
  constructor(public status: number, message: string, public fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ListingError';
  }
}

function utcDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.000)?Z$/.test(value)) return null;
  const date = new Date(value);
  const canonical = value.includes('.') ? value : value.replace('Z', '.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString() === canonical
    && date.getUTCFullYear() >= 1000 && date.getUTCFullYear() <= 9999 ? canonical : null;
}

export function parseListingRequest(body: unknown, donorId: number, now: number): ListingInput[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ListingError(400, 'Provide a confirmed listings array.');
  const data = body as Record<string, unknown>;
  if (data.donorId !== undefined && data.donorId !== donorId) throw new ListingError(403, 'Donor must match the signed-in organization.');
  if (!Array.isArray(data.listings) || data.listings.length < 1 || data.listings.length > 20) {
    throw new ListingError(400, 'Post between 1 and 20 items at a time.');
  }
  const fields: Record<string, string> = {};
  if (data.confirmed !== true) fields.confirmed = 'Confirm that you reviewed every item and its pickup availability.';
  const listings = data.listings.map((raw, index) => {
    const item = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const error = (field: string, message: string) => { fields[`listings.${index}.${field}`] = message; };
    const text = (field: string, max: number) => {
      const value = typeof item[field] === 'string' ? item[field].trim() : '';
      if (!value || value.length > max) error(field, `Enter between 1 and ${max} characters.`);
      return value;
    };
    const name = text('item', 200);
    const unit = text('unit', 50);
    const condition = text('condition', 500);
    if (condition.toLowerCase() === 'unknown') error('condition', 'Describe the known condition before posting.');
    const quantity = item.quantity as number;
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 2147483647) error('quantity', 'Enter a positive whole-number quantity.');
    const weight = item.unitWeight as number;
    const cents = Math.round(weight * 100);
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0 || weight > 999999.99 || Math.abs(weight * 100 - cents) > 0.000001) {
      error('unitWeight', 'Enter a weight per unit from 0.01 to 999999.99 lbs, with at most two decimal places.');
    } else if (!Number.isSafeInteger(cents * quantity) || cents * quantity > 99999999) {
      error('unitWeight', 'The estimated total weight must not exceed 999999.99 lbs.');
    }
    const category = item.category as FoodCategory;
    if (!FOOD_CATEGORIES.includes(category)) error('category', 'Choose a food category.');
    const containsMeat = item.containsMeat as boolean;
    if (typeof containsMeat !== 'boolean') error('containsMeat', 'Confirm whether this item contains or touched meat.');
    if (category === 'meat' && containsMeat !== true) error('containsMeat', 'Meat items must be marked as containing meat.');
    const tier = item.tier as ListingInput['tier'];
    if (![1, 2, 3].includes(tier)) error('tier', 'Choose people, animals, or compost.');
    if (tier === 2 && (containsMeat || category === 'meat')) error('tier', 'Items containing or touching meat cannot be posted for animal feed.');
    const hoursOut = item.hoursOut === null || item.hoursOut === undefined ? null : item.hoursOut as number;
    if (hoursOut !== null && (typeof hoursOut !== 'number' || !Number.isFinite(hoursOut) || hoursOut < 0 || hoursOut > 9999.99 || Math.abs(hoursOut * 100 - Math.round(hoursOut * 100)) > 0.000001)) {
      error('hoursOut', 'Enter nonnegative hours with at most two decimal places.');
    }
    if (category === 'cooked' && hoursOut === null) error('hoursOut', 'Enter how long the cooked food has been out of the fridge or warmer.');
    // A rejection guard, not a safety certification. Hot conditions can require
    // shorter limits: https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/leftovers-and-food-safety
    if (category === 'cooked' && tier === 1 && hoursOut !== null && hoursOut > 2) error('tier', 'Cooked food reported out for more than two hours cannot be posted for people.');
    const readyAt = utcDate(item.readyAt);
    if (!readyAt) error('readyAt', 'Enter a valid ready time.');
    const safeUntil = item.safeUntil === null || item.safeUntil === undefined || item.safeUntil === '' ? null : utcDate(item.safeUntil);
    if (item.safeUntil !== undefined && item.safeUntil !== null && item.safeUntil !== '' && !safeUntil) error('safeUntil', 'Enter a valid pickup deadline.');
    if (tier === 1 && !safeUntil) error('safeUntil', 'Enter a pickup deadline for food intended for people.');
    if (safeUntil && (Date.parse(safeUntil) <= now || (readyAt && Date.parse(safeUntil) <= Date.parse(readyAt)))) {
      error('safeUntil', 'The pickup deadline must be in the future and after the ready time.');
    }
    return { item: name, quantity, unit, unitWeight: cents / 100, condition, category, containsMeat, hoursOut, tier, readyAt: readyAt || '', safeUntil };
  });
  if (Object.keys(fields).length) throw new ListingError(400, 'Review the highlighted listing details.', fields);
  return listings;
}
