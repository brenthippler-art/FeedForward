// Shared contract between frontend and backend.
// Announce in the team channel before changing anything here.

export type Tier = 1 | 2 | 3; // 1 = people, 2 = animal feed, 3 = compost

export type OrgType = 'donor' | 'pantry' | 'farm' | 'compost';

export type ListingStatus = 'available' | 'claimed' | 'picked_up';

export type Organization = {
  id: number;
  name: string;
  type: OrgType;
  address: string;
  lat: number;          // rough location, for distance sorting
  lng: number;
  verified: boolean;
  contactName: string;
  phone: string;
  email: string;
};

// One card on the "suggested recipients" screen
export type RecipientMatch = {
  recipient: Organization;
  distanceMiles: number;
  reasons: string[];  // why it matched, e.g. ["Accepts tier 2", "Picks up until 2pm"]
  aiSummary?: string; // optional one-line explanation written by GenAI
};

export type AcceptanceRule = {
  id: number;
  orgId: number;
  tiers: Tier[];              // which tiers this recipient takes, e.g. [2, 3]
  refusedCategories: string[]; // e.g. ['onions', 'avocado'] for a goat farm
  pickupStart: string;        // "08:00"
  pickupEnd: string;          // "14:00"
};

// What /api/extract returns: the AI's draft, before the donor confirms it
export type FoodCategory = 'produce' | 'dairy' | 'meat' | 'bakery' | 'cooked' | 'other';

export type DraftListing = {
  item: string;
  quantity: number;
  unit: string;
  estimatedLbs: number | null;
  condition: string; // "unknown" when the donor didn't say
  category: FoodCategory;
  containsMeat: boolean;
  hoursOut: number | null; // how long since it was harvested or cooked
  tier: Tier;        // a suggestion only; the donor can change it
  tierReason: string; // why the AI suggested that tier
};

// A saved listing = the draft plus the fields the database adds
export type Listing = DraftListing & {
  id: number;
  donorId: number;
  safeUntil: string | null; // ISO date string
  status: ListingStatus;
};

export type Claim = {
  id: number;
  listingId: number;
  recipientId: number;
  pickupTime: string; // ISO date string
};

export type Pickup = {
  id: number;
  claimId: number;
  actualLbs: number; // real weight; replaces estimatedLbs for impact
  pickedUpAt: string;
};

// What /api/impact returns for the dashboard
export type RecentPickup = {
  pickupId: number;
  date: string;          // ISO date string
  item: string;
  recipientName: string;
  tier: Tier;
  lbs: number;
};

export type Impact = {
  totalLbs: number;
  lbsByTier: Record<Tier, number>; // { 1: 120, 2: 45, 3: 30 }
  meals: number;
  pickups: number;
  recent: RecentPickup[]; // newest first, up to 5
};

export type AvailableListing = Listing & {
  donorName: string;
  distanceMiles: number;
  readyAt: string;
};

export type RecipientPickup = {
  claimId: number;
  listing: AvailableListing;
  pickupTime: string;
  status: 'claimed' | 'picked_up';
  actualLbs: number | null;
};