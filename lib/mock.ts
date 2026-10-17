import type { DraftListing } from '@/types';

// Stand-in for what /api/extract will return. Same shape as the real thing.
export const mockDrafts: DraftListing[] = [
  {
    item: 'Romaine lettuce',
    quantity: 30,
    unit: 'lbs',
    estimatedLbs: 30,
    condition: 'Outer leaves wilted',
    category: 'produce',
    containsMeat: false,
    hoursOut: null,
    tier: 1,
    tierReason: 'Produce in usable condition: OK for people',
  },
  {
    item: 'Cooked rice',
    quantity: 2,
    unit: 'trays',
    estimatedLbs: 12,
    condition: 'unknown',
    category: 'cooked',
    containsMeat: false,
    hoursOut: null,
    tier: 1,
    tierReason: 'Cooked food: answer the safety question to confirm',
  },
  {
    item: 'Potato peels',
    quantity: 1,
    unit: 'bucket',
    estimatedLbs: 15,
    condition: 'Raw',
    category: 'produce',
    containsMeat: false,
    hoursOut: null,
    tier: 3,
    tierReason: 'Peels go to compost by default',
  },
];