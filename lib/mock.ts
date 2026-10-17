import type { DraftListing, Listing, RecipientMatch, Impact, AvailableListing, Tier } from '@/types';
import type { DemoUser } from '@/lib/demo-users';

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
      name: 'Harmony Hall Community Pantry',
      type: 'pantry',
      address: '[SAMPLE ADDRESS]',
      lat: 36.99,
      lng: -86.44,
      verified: true,
      contactName: 'Dana Reyes',
      phone: '(270) 555-0142',
      email: 'pickups@harmonyhall.example',
    },
    distanceMiles: 1.8,
    reasons: ['Accepts fresh produce', 'Picks up until 6:00 pm today'],
    aiSummary: 'Closest pantry that takes produce and can collect before it spoils.',
  },
  {
    recipient: {
      id: 12,
      name: 'Back Porch Supper Table',
      type: 'pantry',
      address: '[SAMPLE ADDRESS]',
      lat: 36.97,
      lng: -86.47,
      verified: true,
      contactName: 'Marcus Webb',
      phone: '(270) 555-0187',
      email: 'kitchen@backporch.example',
    },
    distanceMiles: 3.4,
    reasons: ['Accepts produce for hot meals', 'Picks up until 7:30 pm'],
    aiSummary: 'Can use trimmed greens in tomorrow\u2019s meals.',
  },
  {
    recipient: {
      id: 13,
      name: 'Riverbend Goat & Garden',
      type: 'farm',
      address: '[SAMPLE ADDRESS]',
      lat: 37.03,
      lng: -86.38,
      verified: true,
      contactName: 'Jo Hollis',
      phone: '(270) 555-0119',
      email: 'hello@riverbendgoatandgarden.example',
    },
    distanceMiles: 6.2,
    reasons: ['Backup if people-tier pickups fall through', 'Accepts vegetable trimmings'],
    aiSummary: 'Ranked third because food for people comes first.',
  },
];

export const mockImpact: Impact = {
  totalLbs: 1240,
  lbsByTier: { 1: 760, 2: 310, 3: 170 },
  meals: 0, // 0 until the hustler supplies a sourced lbs-per-meal figure
  pickups: 38,
  recent: [
    { pickupId: 4, date: '2026-10-16', item: 'Romaine lettuce', donorName: 'Two-Step Hot Chicken', recipientName: 'Harmony Hall Community Pantry', tier: 1, lbs: 31 },
    { pickupId: 3, date: '2026-10-16', item: 'Potato peels', donorName: 'Two-Step Hot Chicken', recipientName: 'Last Call Compost', tier: 3, lbs: 14 },
    { pickupId: 2, date: '2026-10-15', item: 'Vegetable trimmings', donorName: 'Two-Step Hot Chicken', recipientName: 'Riverbend Goat & Garden', tier: 2, lbs: 22 },
    { pickupId: 1, date: '2026-10-14', item: 'Day-old bread', donorName: 'Two-Step Hot Chicken', recipientName: 'Back Porch Supper Table', tier: 1, lbs: 18 },
  ],
};

export const mockAvailable: AvailableListing[] = [
  {
    id: 201, donorId: 1, donorName: 'Two-Step Hot Chicken', distanceMiles: 1.8,
    item: 'Romaine lettuce', quantity: 30, unit: 'lbs', estimatedLbs: 30,
    condition: 'Outer leaves wilted', category: 'produce', containsMeat: false, hoursOut: null,
    tier: 1, tierReason: 'Fresh produce in known condition.',
    readyAt: '2026-10-17T22:00:00Z', safeUntil: '2026-10-18T01:00:00Z', status: 'available',
  },
  {
    id: 202, donorId: 2, donorName: 'Athens of the South Dining Hall', distanceMiles: 2.6,
    item: 'Buttermilk biscuits', quantity: 4, unit: 'dozen', estimatedLbs: 12,
    condition: 'Baked this morning', category: 'bakery', containsMeat: false, hoursOut: null,
    tier: 1, tierReason: 'Baked goods in known condition.',
    readyAt: '2026-10-17T21:00:00Z', safeUntil: '2026-10-18T03:00:00Z', status: 'available',
  },
  {
    id: 203, donorId: 1, donorName: 'Two-Step Hot Chicken', distanceMiles: 1.8,
    item: 'Cooked rice', quantity: 2, unit: 'trays', estimatedLbs: 12,
    condition: 'Held hot, out 1 hour', category: 'cooked', containsMeat: false, hoursOut: 1,
    tier: 1, tierReason: 'Cooked food out less than 2 hours.',
    readyAt: '2026-10-17T22:00:00Z', safeUntil: '2026-10-17T23:00:00Z', status: 'available',
  },
  {
    id: 204, donorId: 2, donorName: 'Athens of the South Dining Hall', distanceMiles: 2.6,
    item: 'Vegetable trimmings', quantity: 22, unit: 'lbs', estimatedLbs: 22,
    condition: 'Raw, kept separate from meat', category: 'produce', containsMeat: false, hoursOut: null,
    tier: 2, tierReason: 'Plant-based and never touched meat, so it can feed goats and chickens.',
    readyAt: '2026-10-17T21:00:00Z', safeUntil: null, status: 'available',
  },
  {
    id: 205, donorId: 1, donorName: 'Two-Step Hot Chicken', distanceMiles: 1.8,
    item: 'Chicken bones and fryer scraps', quantity: 1, unit: 'bucket', estimatedLbs: 15,
    condition: 'Mixed with breading', category: 'meat', containsMeat: true, hoursOut: null,
    tier: 3, tierReason: 'Contains meat, so compost only.',
    readyAt: '2026-10-17T22:00:00Z', safeUntil: null, status: 'available',
  },
];

export const mockRecipientTiers: Record<number, Tier[]> = {
  11: [1],
  12: [1],
  13: [2],
  14: [3],
};

export function mockListingsFor(recipientId: number) {
  const tiers = mockRecipientTiers[recipientId] ?? [];
  return mockAvailable.filter((listing) => tiers.includes(listing.tier));
}

export function mockImpactFor(user?: DemoUser | null): Impact {
  if (!user || user.role === 'donor') return mockImpact;

  const recent = mockImpact.recent.filter((row) => row.recipientName === user.name);
  const lbsByTier: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };
  for (const row of recent) {
    lbsByTier[row.tier] += row.lbs;
  }

  return {
    totalLbs: recent.reduce((sum, row) => sum + row.lbs, 0),
    lbsByTier,
    meals: 0,
    pickups: recent.length,
    recent,
  };
}

export function mockImpactSummary(impact: Impact, user?: DemoUser | null): string {
  const lbs = impact.totalLbs.toLocaleString('en-US');

  if (!user) {
    return `This month FeedForward partners kept ${lbs} lbs of food out of the dumpster. Most of it fed people, trimmings fed local farm animals, and the rest became compost.`;
  }

  if (user.role === 'recipient') {
    const trips = impact.pickups === 1 ? '1 pickup' : `${impact.pickups} pickups`;
    return `This month ${user.name} rescued ${lbs} lbs of surplus food in ${trips} from local donors. That's food that would otherwise have gone to waste.`;
  }

  return `This month ${user.name} kept ${lbs} lbs of food out of the dumpster. Most of it went to people through local pantries and a shelter kitchen, trimmings fed a nearby goat farm, and the rest became compost.`;
}