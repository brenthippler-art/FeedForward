// Tier-assignment rules. The AI drafts a listing; this file decides the tier —
// see README.md "Technical decisions" and lib/safety-facts.ts for the cited sources
// behind each rule. Advisory, not a certification: every listing still needs the
// donor's confirmation.
import type { FoodCategory, Tier } from '@/types';

export type TierInput = {
  category: FoodCategory;
  containsMeat: boolean;
  hoursOut: number | null;
  condition: string;
};

export type TierAssignment = { tier: Tier; tierReason: string };

// USDA: never leave perishable food in the 40-140°F danger zone more than 2 hours.
// lib/safety-facts.ts: "Cooked food follows the USDA 2-hour rule."
const COOKED_SAFE_HOURS = 2;

const SPOILAGE_KEYWORDS = ['spoiled', 'moldy', 'mold', 'rotten', 'rancid', 'sour', 'rotting'];
const INEDIBLE_TRIM_KEYWORDS = ['peel', 'peels', 'scrap', 'scraps', 'trim', 'rind', 'core', 'skin'];

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

const CATEGORY_LABEL: Record<FoodCategory, string> = {
  produce: 'Produce',
  dairy: 'Dairy',
  meat: 'Meat',
  bakery: 'Baked good',
  cooked: 'Cooked food',
  other: 'Food',
};

export function assignTier(input: TierInput): TierAssignment {
  const { category, containsMeat, hoursOut, condition } = input;

  // Donor-described spoilage always wins, regardless of category or meat content.
  if (matchesAny(condition, SPOILAGE_KEYWORDS)) {
    return { tier: 3, tierReason: 'Donor-described condition indicates spoilage: compost only.' };
  }

  // The USDA 2-hour rule is specifically about cooked/perishable food sitting out.
  if (category === 'cooked') {
    if (hoursOut === null) {
      // Tentative tier, pending the donor confirming how long it's been out.
      return {
        tier: 1,
        tierReason: 'Cooked food: confirm how long it has been out to verify the 2-hour safety window.',
      };
    }
    if (hoursOut > COOKED_SAFE_HOURS) {
      // Past the window for people. Meat never goes to animals either way
      // (Swine Health Protection Act), so it skips tier 2 straight to compost.
      return containsMeat
        ? { tier: 3, tierReason: 'Cooked meat past the USDA 2-hour window: compost only (never fed to animals).' }
        : { tier: 2, tierReason: 'Cooked, plant-based, past the 2-hour window for people: OK for animal feed.' };
    }
    if (containsMeat) return { tier: 1, tierReason: 'Cooked meat within the USDA 2-hour window: OK for people.' };
    if (matchesAny(condition, INEDIBLE_TRIM_KEYWORDS)) {
      return { tier: 2, tierReason: 'Cooked, plant-based scraps: OK for animal feed.' };
    }
    return { tier: 1, tierReason: 'Cooked, plant-based, within the USDA 2-hour window: OK for people.' };
  }

  // Swine Health Protection Act: food containing meat is never fed to animals.
  if (containsMeat) {
    return { tier: 1, tierReason: 'Contains meat: OK for people; federal law bars feeding meat waste to animals.' };
  }

  // Produce peels/trim/rinds aren't meant for human consumption.
  if (category === 'produce' && matchesAny(condition, INEDIBLE_TRIM_KEYWORDS)) {
    return { tier: 3, tierReason: 'Inedible produce trim: compost only.' };
  }

  // No cited source gives a numeric shelf-life threshold for raw produce, dairy,
  // bakery, or uncooked meat, so we don't invent one here — default to tier 1 and
  // rely on the donor's condition text for anything that needs a closer look.
  return { tier: 1, tierReason: `${CATEGORY_LABEL[category]} in usable condition: OK for people.` };
}
