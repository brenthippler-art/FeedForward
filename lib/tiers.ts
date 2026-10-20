import type { FoodCategory, Tier } from '@/types';

export type TierFacts = {
  category: FoodCategory;
  containsMeat: boolean;
  hoursOut: number | null;
  edibleForPeople: boolean;
};

// The AI only describes the food. These rules pick where it goes, following the
// EPA Wasted Food Scale: people first, then animals, then compost. The donor can
// still change the destination, and the listing rules check it again before posting.
export function suggestTier(facts: TierFacts): { tier: Tier; tierReason: string } {
  const meat = facts.containsMeat || facts.category === 'meat';
  const cookedTooLong = facts.category === 'cooked' && facts.hoursOut !== null && facts.hoursOut > 2;

  if (facts.edibleForPeople && !cookedTooLong) {
    if (facts.category === 'cooked' && facts.hoursOut === null) {
      return { tier: 1, tierReason: 'Cooked food can go to people: confirm how long it has been out' };
    }
    return { tier: 1, tierReason: 'Edible food goes to people first' };
  }

  if (!meat) {
    return {
      tier: 2,
      tierReason: cookedTooLong
        ? 'Out more than 2 hours, so not for people. Plant-based, so it can feed animals (never pigs)'
        : 'Not for people, but plant-based scraps can feed animals (never pigs)',
    };
  }

  return {
    tier: 3,
    tierReason: cookedTooLong
      ? 'Out more than 2 hours and contains meat, so it goes to compost'
      : 'Contains or touched meat, so it can’t go to animals. It goes to compost',
  };
}