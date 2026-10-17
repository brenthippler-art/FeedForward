import type { DraftListing, Listing, RecipientMatch } from '@/types';

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

// The listing the donor just confirmed
export const mockListing: Listing = {
  ...mockDrafts[0],
  id: 101,
  donorId: 1,
  safeUntil: '2026-10-18T01:00:00Z', // 8:00 pm Central
  status: 'available',
};

// What /api/matches will return: up to 3, already ranked by the backend
export const mockMatches: RecipientMatch[] = [
  {
    recipient: {
      id: 11,
      name: 'Eastside Community Pantry',
      type: 'pantry',
      address: '[SAMPLE ADDRESS]',
      lat: 36.99,
      lng: -86.44,
      verified: true,
      contactName: 'Dana Reyes',
      phone: '(270) 555-0142',
      email: 'pickups@eastside-pantry.example',
    },
    distanceMiles: 1.8,
    reasons: ['Accepts fresh produce', 'Picks up until 6:00 pm today'],
    aiSummary: 'Closest pantry that takes produce and can collect before it spoils.',
  },
  {
    recipient: {
      id: 12,
      name: 'Hope Street Shelter Kitchen',
      type: 'pantry',
      address: '[SAMPLE ADDRESS]',
      lat: 36.97,
      lng: -86.47,
      verified: true,
      contactName: 'Marcus Webb',
      phone: '(270) 555-0187',
      email: 'kitchen@hopestreet.example',
    },
    distanceMiles: 3.4,
    reasons: ['Accepts produce for hot meals', 'Picks up until 7:30 pm'],
    aiSummary: 'Can use trimmed greens in tomorrow\u2019s meals.',
  },
  {
    recipient: {
      id: 13,
      name: 'Willow Creek Farm',
      type: 'farm',
      address: '[SAMPLE ADDRESS]',
      lat: 37.03,
      lng: -86.38,
      verified: true,
      contactName: 'Jo Hollis',
      phone: '(270) 555-0119',
      email: 'hello@willowcreek.example',
    },
    distanceMiles: 6.2,
    reasons: ['Backup if people-tier pickups fall through', 'Accepts vegetable trimmings'],
    aiSummary: 'Ranked third because food for people comes first.',
  },
];